
# Результаты тестирования мобильного drag-and-drop

## Статус: ✅ Работает корректно

На основе анализа кода и данных session_replay, мобильный drag-and-drop **полностью функционален**:

### Подтверждённая работа
- Long press (200ms) на карточку активирует перетаскивание
- Появляется панель статусов `MobileDropZones` в верхней части экрана
- Карточку можно перетащить на любой статус
- Статус меняется оптимистично с toast-уведомлением
- Свайпы отключаются во время перетаскивания

### Обнаруженное предупреждение (некритично)

В консоли есть предупреждение:
```
Warning: Function components cannot be given refs. 
Attempts to access this ref will fail. 
Did you mean to use React.forwardRef()?
```

**Причина:** Компонент `TaskCard` используется внутри `DragOverlay`, который пытается передать ref. Это предупреждение НЕ влияет на функциональность, но может вызывать небольшие проблемы с анимацией DragOverlay.

## Предлагаемое исправление

Добавить `forwardRef` в компонент `TaskCard`, чтобы он мог принимать ref от DragOverlay:

### Изменения в `src/components/TaskCard.tsx`

```typescript
import { memo, forwardRef } from 'react';
// ...

export const TaskCard = memo(forwardRef<HTMLDivElement, TaskCardProps>(
  function TaskCard({ task, onClick, isSyncing }, ref) {
    const importanceStyles = getImportanceStyles(task.importance);
    
    return (
      <Card 
        ref={ref}
        className={...}
        onClick={onClick}
      >
        {/* содержимое */}
      </Card>
    );
  }
));
```

## Вывод

Мобильный drag-and-drop работает! Предложенное исправление устранит предупреждение в консоли и улучшит совместимость с dnd-kit.
