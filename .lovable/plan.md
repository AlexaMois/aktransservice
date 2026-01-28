
## План исправления: Drag-and-Drop не обнаруживает цели

### Диагностика

Логи консоли показывают ключевую проблему:
```
DragEnd event: { activeId: "...", overId: undefined }
DragEnd: no over target
```

`overId` всегда `undefined` — это означает, что `dnd-kit` не находит ни одной droppable-зоны при отпускании карточки.

### Корневая причина

В `DraggableTaskCard.tsx` при `isDragging=true`:
```jsx
<div className="opacity-0 h-0 overflow-hidden pointer-events-none" />
```

Проблема: `h-0` делает элемент нулевой высоты. Алгоритм `rectIntersection` использует прямоугольник перетаскиваемого элемента (`active.rect.current.translated`) для обнаружения пересечений. Если этот прямоугольник имеет размер 0×0, пересечений не находится!

### Решение

Сохранить размеры элемента при перетаскивании, но сделать его визуально невидимым:

```text
Файл: src/components/DraggableTaskCard.tsx

// Вместо h-0, использовать visibility: hidden
if (isDragging) {
  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`invisible pointer-events-none border-border/50 bg-card p-2.5 
        touch-none overflow-hidden ${importanceStyles.borderClass}`}
    >
      {/* Контент сохраняется для правильного размера */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <Badge>...</Badge>
      </div>
      <h3>{task.title}</h3>
      <p>{task.summary}</p>
    </Card>
  );
}
```

### Изменения

**Файл: `src/components/DraggableTaskCard.tsx`**
- Заменить `<div className="opacity-0 h-0 ...">` на `<Card className="invisible ...">`
- Сохранить полную структуру контента карточки внутри placeholder
- Использовать `invisible` (visibility: hidden) вместо `opacity-0 h-0`
- Это сохраняет rect элемента для collision detection

### Почему это работает

| Свойство | `h-0` | `invisible` |
|----------|-------|-------------|
| Видимость | Нет | Нет |
| Занимает место | Нет | Да |
| Rect для dnd-kit | 0×0 (сломано!) | Нормальный размер |
| Collision detection | Не работает | Работает ✓ |

### Дополнительно

Также добавлю `opacity-50` на placeholder чтобы показать "откуда" перетащили карточку — это даст лучший визуальный фидбек пользователю.

### Ожидаемый результат

- `overId` будет корректно определяться при drop
- Карточки будут перетаскиваться между колонками
- Статус будет меняться сразу (оптимистичное обновление)
