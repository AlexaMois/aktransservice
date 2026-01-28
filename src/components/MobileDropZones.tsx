import { useDroppable } from '@dnd-kit/core';
import { TaskStatus, STATUS_LABELS } from '@/types/task';
import { cn } from '@/lib/utils';

const STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'review', 'completed'];

interface MobileDropZonesProps {
  activeDragId: string | null;
  currentStatus?: TaskStatus;
}

interface DropZoneProps {
  status: TaskStatus;
  isCurrentStatus: boolean;
}

const DropZone = ({ status, isCurrentStatus }: DropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  // Short labels for mobile
  const shortLabels: Record<TaskStatus, string> = {
    'ideas': 'Идеи',
    'planned': 'План',
    'in-progress': 'Работа',
    'review': 'Проверка',
    'completed': 'Готово',
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 py-2 px-1 text-center text-xs font-medium rounded-md transition-all duration-200 min-w-0',
        'border-2',
        isOver 
          ? 'bg-primary text-primary-foreground border-primary scale-105 shadow-lg' 
          : isCurrentStatus
            ? 'bg-muted text-muted-foreground border-muted-foreground/30'
            : 'bg-card text-card-foreground border-border hover:border-primary/50'
      )}
    >
      <span className="truncate block">{shortLabels[status]}</span>
    </div>
  );
};

export const MobileDropZones = ({ activeDragId, currentStatus }: MobileDropZonesProps) => {
  // Don't render if not dragging
  if (!activeDragId) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-2 shadow-lg animate-in slide-in-from-top duration-200">
      <div className="container mx-auto">
        <p className="text-[10px] text-muted-foreground text-center mb-1.5">
          Перетащите на нужный статус
        </p>
        <div className="flex gap-1">
          {STATUSES.map((status) => (
            <DropZone
              key={status}
              status={status}
              isCurrentStatus={status === currentStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
