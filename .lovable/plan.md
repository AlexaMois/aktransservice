
# План: Персональные листы задач в Google Sheets

## Архитектурное изменение

Сейчас все задачи хранятся в одном листе `Tasks` и фильтруются на клиенте по `task_scope`. Это неправильно.

**Новая архитектура:**
- **Лист `Tasks`** - общие задачи цифровизации (task_scope = 'digitization')
- **Персональные листы** - `Tasks_Имя_Фамилия` для каждого пользователя (task_scope = 'personal')

Выбор листа происходит на уровне API, не на клиенте.

```text
Цифровизация         Мои задачи
     │                    │
     ▼                    ▼
  Tasks              Tasks_Alexandra_Moiseeva
  (общий)            (персональный)
```

---

## Часть 1: Edge Function - поддержка персональных листов

**Файл:** `supabase/functions/gsheets-api/index.ts`

### 1.1 Функция генерации имени персонального листа

```typescript
function getPersonalSheetName(userName: string): string {
  // Транслитерация кириллицы в латиницу
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', ' ': '_'
  };
  
  const transliterated = userName.toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');
  
  // Capitalize each word
  const formatted = transliterated
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');
  
  return `Tasks_${formatted}`;
}
```

### 1.2 Определение листа для операций с задачами

Добавить в обработчик `tasks`:

```typescript
case 'tasks': {
  const user = (req as any).user as AppUser;
  const requestedScope = data?.task_scope || 'digitization';
  
  // Определяем лист на основе scope
  let sheetName: string;
  if (requestedScope === 'personal') {
    sheetName = getPersonalSheetName(user.name);
  } else {
    sheetName = SHEETS.tasks; // 'Tasks'
  }
  
  // Ensure sheet exists
  await ensureSheetExists(accessToken, sheetName, TASK_COLUMNS, spreadsheetId);
  
  // ... остальная логика CRUD
}
```

### 1.3 Модификация action === 'list'

```typescript
if (action === 'list') {
  const requestedScope = data?.task_scope || 'digitization';
  
  let sheetName: string;
  if (requestedScope === 'personal') {
    sheetName = getPersonalSheetName(user.name);
    await ensureSheetExists(accessToken, sheetName, TASK_COLUMNS, spreadsheetId);
  } else {
    sheetName = SHEETS.tasks;
  }
  
  const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
  // ... маппинг данных
  
  // Добавляем task_scope ко всем задачам для совместимости
  result = rows.slice(1).map(row => ({
    ...rowToObject(row, headers),
    task_scope: requestedScope
  }));
}
```

---

## Часть 2: Frontend API - передача task_scope

**Файл:** `src/lib/api/gsheets.ts`

### 2.1 Модификация gsheetsTasksApi

```typescript
export const gsheetsTasksApi = {
  async list(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
    const data = await callGSheetsAPI<Task[]>('list', 'tasks', { task_scope: taskScope });
    return data.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    // task_scope уже включен в объект task
    return callGSheetsAPI<Task>('create', 'tasks', task as unknown as Record<string, unknown>);
  },
  
  async update(id: string, updates: Partial<Task>, taskScope: TaskScope = 'digitization'): Promise<Task> {
    return callGSheetsAPI<Task>('update', 'tasks', { 
      ...updates, 
      task_scope: taskScope 
    } as unknown as Record<string, unknown>, id);
  },
  
  async delete(id: string, taskScope: TaskScope = 'digitization'): Promise<void> {
    await callGSheetsAPI<void>('delete', 'tasks', { task_scope: taskScope }, id);
  },
};
```

---

## Часть 3: Task API - прокидывание scope

**Файл:** `src/entities/task/api.ts`

```typescript
import { Task, TaskStatus, TaskScope } from './model';
import { gsheetsTasksApi } from '@/lib/api/gsheets';

export async function fetchTasks(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
  return gsheetsTasksApi.list(taskScope);
}

export async function createTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<Task> {
  return gsheetsTasksApi.create({
    ...task,
    status: 'ideas' as TaskStatus,
  });
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  taskScope: TaskScope = 'digitization'
): Promise<Task> {
  return gsheetsTasksApi.update(taskId, updates, taskScope);
}

export async function deleteTask(
  taskId: string, 
  taskScope: TaskScope = 'digitization'
): Promise<void> {
  return gsheetsTasksApi.delete(taskId, taskScope);
}
```

---

## Часть 4: Hook - раздельная загрузка

**Файл:** `src/hooks/useGSheetsTasks.ts`

```typescript
export function useGSheetsTasks(
  taskScope: TaskScope = 'digitization',
  pollingInterval = DEFAULT_POLLING_INTERVAL, 
  enabled = true
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  
  // ... useSyncStatus ...

  const fetchTasks = useCallback(async (showLoading = true) => {
    if (!enabled) {
      setTasks([]);
      setLoading(false);
      return;
    }
    if (showLoading && isInitialLoad.current) {
      setLoading(true);
    }
    try {
      // Загружаем задачи из нужного листа
      const data = await taskApi.fetchTasks(taskScope);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [enabled, taskScope]); // taskScope в зависимостях!

  // Перезагрузка при смене scope
  useEffect(() => {
    if (!enabled) return;
    isInitialLoad.current = true;
    fetchTasks(true);
  }, [enabled, taskScope, fetchTasks]);

  const addTask = async (task) => {
    const newTask = await taskApi.createTask({
      ...task,
      task_scope: taskScope,
    });
    await fetchTasks(false);
    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const updatedTask = await taskApi.updateTask(taskId, updates, taskScope);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    return updatedTask;
  };

  const deleteTask = async (taskId: string) => {
    await taskApi.deleteTask(taskId, taskScope);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // ...
}
```

---

## Часть 5: Index.tsx - использование нового API

**Файл:** `src/pages/Index.tsx`

### 5.1 Передача taskScope в хук

```typescript
const { tasks, loading, addTask, updateTask, deleteTask, refetch, ... } =
  useGSheetsTasks(taskScope, undefined, isLoggedIn);
//              ^^^^^^^^^ передаем текущий scope
```

### 5.2 Удаление клиентской фильтрации по task_scope

```typescript
const filteredTasks = useMemo(() => {
  return regularTasks.filter((task) => {
    // УДАЛЕНО: фильтрация по task_scope
    // Теперь API возвращает только задачи из нужного листа
    
    // Остальные фильтры остаются
    if (searchQuery) { /* ... */ }
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    // ...
    return true;
  });
}, [regularTasks, searchQuery, statusFilter, /* ... БЕЗ taskScope */]);
```

### 5.3 Добавление эффекта перезагрузки при смене scope

```typescript
// Перезагрузка при смене scope теперь происходит автоматически в хуке
// Но добавим явный индикатор загрузки
useEffect(() => {
  // При смене scope показать лоадер
}, [taskScope]);
```

---

## Часть 6: Права доступа

### 6.1 Админ видит все персональные листы

В Edge Function добавить action для получения списка всех персональных листов:

```typescript
if (action === 'listPersonalSheets' && user.role === 'admin') {
  // Получить список всех листов, начинающихся с "Tasks_"
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaResponse = await fetch(metaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const metaData = await metaResponse.json();
  
  const personalSheets = metaData.sheets
    ?.filter((s: any) => s.properties.title.startsWith('Tasks_'))
    ?.map((s: any) => s.properties.title) || [];
  
  result = { sheets: personalSheets };
}
```

### 6.2 Пользователь видит только свой лист

Проверка уже встроена - имя листа генерируется из имени пользователя в сессии.

---

## Структура листов в Google Sheets

```text
┌─────────────────────────────────────────────────────────┐
│ Google Spreadsheet                                      │
├─────────────────────────────────────────────────────────┤
│ • Tasks (общий лист цифровизации)                       │
│ • Tasks_Alexandra_Moiseeva (персональный)               │
│ • Tasks_Arseniy_Pakhomov (персональный)                 │
│ • Tasks_Anashkina_Alexandra (персональный)              │
│ • Announcements                                          │
│ • Comments                                               │
│ • Users                                                  │
│ • UserRoles                                              │
│ • ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Порядок выполнения

1. **Edge Function** - добавить функцию транслитерации и поддержку персональных листов
2. **gsheets.ts** - добавить параметр taskScope в API методы
3. **api.ts** - прокинуть taskScope
4. **useGSheetsTasks.ts** - принимать taskScope, перезагружать при изменении
5. **Index.tsx** - передавать taskScope в хук, убрать клиентскую фильтрацию

---

## Финальный чеклист

| Проверка | Ожидание |
|----------|----------|
| Создание задачи в «Цифровизация» | Появляется в листе Tasks |
| Создание задачи в «Мои задачи» | Появляется в листе Tasks_Имя_Фамилия |
| Переключение режима | Список задач полностью меняется |
| После F5 | Задачи не исчезают |
| Drag&Drop | Статус меняется в правильном листе |
| Admin в «Мои задачи» | Видит свой персональный лист |
| User в «Мои задачи» | Видит только свой лист |
