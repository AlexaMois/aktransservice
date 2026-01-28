

## План исправления Drag-and-Drop на Kanban-доске

### Проблема
При перетаскивании карточки между колонками:
1. Статус задачи не меняется (карточка возвращается в исходную позицию)
2. Появляются визуальные дубликаты карточек

### Анализ причин

**Причина 1: Неправильная стратегия обнаружения столкновений**
- Текущий код использует `pointerWithin` — срабатывает только когда курсор мыши находится внутри droppable-зоны
- Если карточка визуально над колонкой, но курсор — чуть в стороне, drop не регистрируется

**Причина 2: ScrollArea блокирует collision detection**
- `ScrollArea` (Radix) создаёт внутренний viewport с `overflow: hidden`
- Ref droppable-зоны находится на контейнере, но реальные расчёты rect происходят внутри viewport
- Это приводит к неправильному определению границ колонки

**Причина 3: Конфликт refs при isDragging**
- В `DraggableTaskCard` при `isDragging=true` всё ещё передаются `listeners`, `attributes` и `ref` на placeholder-элемент
- Это создаёт конфликт с `DragOverlay`, который показывает копию карточки

### План исправления

#### Шаг 1: Изменить стратегию collision detection
Файл: `src/pages/Index.tsx`
- Заменить `pointerWithin` на `rectIntersection` — срабатывает когда прямоугольники перекрываются
- Добавить `MeasuringStrategy.Always` для постоянного пересчёта координат droppable-зон

```text
import { 
  DndContext, 
  rectIntersection, 
  MeasuringStrategy,
  ...
} from '@dnd-kit/core';

<DndContext
  sensors={sensors}
  collisionDetection={rectIntersection}
  measuring={{
    droppable: { strategy: MeasuringStrategy.Always }
  }}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
```

#### Шаг 2: Вынести droppable-зону из ScrollArea
Файл: `src/components/DroppableKanbanColumn.tsx`
- Сейчас `setNodeRef` на внешнем контейнере, но `ScrollArea` создаёт viewport внутри
- Решение: сделать явное разделение — внешний контейнер для droppable, внутренний для скролла
- Добавить `min-h-full` к внутреннему контейнеру задач для корректного hit-testing

```text
// Структура:
<div ref={setNodeRef} className="flex flex-col ... h-full">
  <div className="header">...</div>
  <ScrollArea className="flex-1">
    <div className="flex flex-col gap-1.5 min-h-full">
      {tasks.map(...)}
    </div>
  </ScrollArea>
</div>
```

#### Шаг 3: Исправить DraggableTaskCard при isDragging
Файл: `src/components/DraggableTaskCard.tsx`
- Убрать `listeners`, `attributes` из placeholder — они не нужны, так как карточка уже "захвачена"
- Сохранить только `ref` для поддержания DOM-позиции
- Это устранит визуальные дубли и конфликты

```text
if (isDragging) {
  return (
    <div 
      ref={setNodeRef}
      className="opacity-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
}
```

#### Шаг 4: Добавить debug-логирование (временно)
Файл: `src/pages/Index.tsx`
- Добавить console.log в handleDragEnd для отладки
- После подтверждения работы — удалить

```text
const handleDragEnd = async (event: DragEndEvent) => {
  console.log('DragEnd event:', { 
    activeId: event.active?.id, 
    overId: event.over?.id 
  });
  // ... rest of handler
};
```

### Технические детали

**Почему `rectIntersection` лучше `pointerWithin`:**
- `pointerWithin` — курсор должен быть внутри зоны
- `rectIntersection` — прямоугольник перетаскиваемого элемента должен пересекаться с droppable-зоной
- Для канбан-доски `rectIntersection` интуитивнее — карточка визуально над колонкой = drop работает

**Почему нужен `MeasuringStrategy.Always`:**
- По умолчанию dnd-kit кеширует размеры droppable-зон
- При скролле или ресайзе кеш устаревает
- `Always` пересчитывает размеры при каждом движении — надёжнее, но чуть медленнее

### Ожидаемый результат
- Перетаскивание работает плавно во всех колонках
- Статус обновляется сразу (оптимистичное обновление) и синхронизируется с сервером
- Нет визуальных дублей карточек
- Работает как на ПК (мышь), так и на мобильных устройствах (touch)

