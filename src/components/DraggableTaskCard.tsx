import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lightbulb, ListTodo, Megaphone, HelpCircle } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { getImportanceStyles } from '@/lib/importanceUtils';

interface DraggableTaskCardProps {
  task: Task;
  onClick: () => void;
  isSyncing?: boolean;
}

const TaskTypeIcon = ({ type }: { type: Task['task_type'] }) => {
  const icons = {
    idea: Lightbulb,
    problem: AlertTriangle,
    task: ListTodo,
    announcement: Megaphone,
    question: HelpCircle,
  };
  const Icon = icons[type];
  return <Icon className="h-3 w-3" />;
};

export const DraggableTaskCard = memo(function DraggableTaskCard({ task, onClick, isSyncing }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const importanceStyles = getImportanceStyles(task.importance);

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Static placeholder - stays in place while DragOverlay shows the moving copy
  // Must NOT have style={style} - that's what makes the overlay move, not the placeholder
  if (isDragging) {
    return (
      <Card 
        ref={setNodeRef}
        className={`opacity-30 pointer-events-none border-dashed border-2 border-border bg-muted/30 p-2.5 touch-none overflow-hidden ${importanceStyles.borderClass}`}
        aria-hidden="true"
      >
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 ${TASK_TYPE_COLORS[task.task_type]}`}>
            <TaskTypeIcon type={task.task_type} />
            {TASK_TYPE_LABELS[task.task_type]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-bold ${importanceStyles.badgeClass}`}>
            {importanceStyles.label}
          </Badge>
        </div>
        <h3 
          className="font-medium text-xs leading-tight text-muted-foreground mb-1 break-words"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' }}
        >
          {task.title}
        </h3>
        <p 
          className="text-[10px] text-muted-foreground/70 break-words"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' }}
        >
          {task.summary}
        </p>
      </Card>
    );
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab transition-all duration-200 border-border/50 bg-card p-2.5 touch-none overflow-hidden ${importanceStyles.borderClass}
        hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]
        ${isSyncing ? 'opacity-70' : ''}
      `}
      onClick={(e) => {
        onClick();
      }}
    >
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 ${TASK_TYPE_COLORS[task.task_type]}`}>
          <TaskTypeIcon type={task.task_type} />
          {TASK_TYPE_LABELS[task.task_type]}
        </Badge>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-bold ${importanceStyles.badgeClass}`}>
          {importanceStyles.label}
        </Badge>
        {isSyncing && (
          <span className="text-[9px] text-muted-foreground animate-pulse">●</span>
        )}
      </div>
      
      <h3 
        className="font-medium text-xs leading-tight text-card-foreground mb-1 break-words"
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' }}
      >
        {task.title}
      </h3>
      
      <p 
        className="text-[10px] text-muted-foreground break-words"
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' }}
      >
        {task.summary}
      </p>
    </Card>
  );
});
