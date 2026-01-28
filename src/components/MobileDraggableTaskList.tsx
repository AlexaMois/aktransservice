import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus, STATUS_LABELS } from '@/types/task';
import { DraggableTaskCard } from './DraggableTaskCard';
import { Button } from '@/components/ui/button';

interface MobileDraggableTaskListProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddClick?: (type: 'idea' | 'task') => void;
  isTaskSyncing?: (taskId: string) => boolean;
  isDragging?: boolean;
  allStatuses?: TaskStatus[];
}

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'review', 'completed'];

// Mini drop zones shown only during drag
const MobileDropZones = memo(function MobileDropZones({ 
  currentStatus 
}: { 
  currentStatus: TaskStatus;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 mb-4 p-2 bg-accent/50 rounded-lg">
      {STATUSES.map((status) => {
        const { setNodeRef, isOver } = useDroppable({ id: status });
        const isCurrent = status === currentStatus;
        
        return (
          <div
            key={status}
            ref={setNodeRef}
            className={`py-3 px-1 text-center rounded-md text-[10px] font-medium transition-all
              ${isOver ? 'bg-primary text-primary-foreground scale-105' : 
                isCurrent ? 'bg-muted text-muted-foreground' : 'bg-background text-foreground hover:bg-accent'}
            `}
          >
            {STATUS_LABELS[status].split(' ')[0]}
          </div>
        );
      })}
    </div>
  );
});

export const MobileDraggableTaskList = memo(function MobileDraggableTaskList({
  status,
  tasks,
  onTaskClick,
  onAddClick,
  isTaskSyncing,
  isDragging = false,
}: MobileDraggableTaskListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const showAddButton = status === 'ideas' || status === 'planned';

  return (
    <div>
      {/* Show drop zones for all statuses when dragging */}
      {isDragging && <MobileDropZones currentStatus={status} />}
      
      <div 
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors duration-200 ${
          isOver && !isDragging ? 'bg-primary/10 ring-2 ring-primary/30' : ''
        }`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            isSyncing={isTaskSyncing?.(task.id)}
          />
        ))}
        
        {tasks.length === 0 && !isDragging && (
          <div className="text-center py-8">
            {showAddButton && onAddClick ? (
              <Button 
                variant="outline" 
                onClick={() => onAddClick(status === 'ideas' ? 'idea' : 'task')}
                className="gap-2"
              >
                {status === 'ideas' ? 'Добавить предложение' : 'Добавить задачу'}
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                Нет задач в этом статусе
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
