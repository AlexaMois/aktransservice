import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/entities/task';
import { DraggableTaskCard } from './DraggableTaskCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Lightbulb, ListTodo } from 'lucide-react';

interface DroppableKanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddClick?: (defaultType: 'idea' | 'task') => void;
  isTaskSyncing?: (taskId: string) => boolean;
}

const statusColors: Record<TaskStatus, string> = {
  'ideas': 'bg-chart-3/20 border-chart-3',
  'planned': 'bg-chart-1/20 border-chart-1',
  'in-progress': 'bg-primary/20 border-primary',
  'review': 'bg-chart-4/20 border-chart-4',
  'completed': 'bg-green-500/20 border-green-500',
};

const statusHeaderColors: Record<TaskStatus, string> = {
  'ideas': 'text-chart-5',
  'planned': 'text-chart-5',
  'in-progress': 'text-primary',
  'review': 'text-chart-4',
  'completed': 'text-green-600',
};

const STATUS_SHORT_LABELS: Record<TaskStatus, string> = {
  'ideas': 'Идеи',
  'planned': 'План',
  'in-progress': 'В работе',
  'review': 'Проверка',
  'completed': 'Готово',
};

export const DroppableKanbanColumn = memo(function DroppableKanbanColumn({ 
  status, 
  tasks, 
  onTaskClick, 
  onAddClick,
  isTaskSyncing,
}: DroppableKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const showAddButton = (status === 'ideas' || status === 'planned') && tasks.length === 0;
  const addButtonConfig = status === 'ideas' 
    ? { label: 'Добавить', icon: Lightbulb, type: 'idea' as const }
    : { label: 'Добавить', icon: ListTodo, type: 'task' as const };

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col rounded-lg flex-1 min-w-0 transition-colors duration-200
        ${isOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-accent/30'}
      `}
    >
      <div className={`px-2 py-2 border-b-2 ${statusColors[status]} rounded-t-lg`}>
        <div className="flex items-center justify-between gap-1">
          <h2 className={`font-semibold text-xs ${statusHeaderColors[status]} truncate`}>
            {STATUS_SHORT_LABELS[status]}
          </h2>
          <span className="text-[10px] font-medium bg-background/80 text-foreground px-1.5 py-0.5 rounded-full shrink-0">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-1.5">
        <div className="flex flex-col gap-1.5 min-h-[100px]">
          {tasks.map((task) => (
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              isSyncing={isTaskSyncing?.(task.id)}
            />
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center py-4">
              {showAddButton && onAddClick ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7 px-2"
                  onClick={() => onAddClick(addButtonConfig.type)}
                >
                  <addButtonConfig.icon className="h-3 w-3" />
                  {addButtonConfig.label}
                </Button>
              ) : (
                <p className="text-muted-foreground text-[10px]">
                  {isOver ? 'Отпустите здесь' : 'Нет задач'}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
