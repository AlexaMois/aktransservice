import { useDraggable } from '@dnd-kit/core';
import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lightbulb, ListTodo, Megaphone, HelpCircle } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';

interface DraggableTaskCardProps {
  task: Task;
  onClick: () => void;
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

export function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab transition-all duration-200 border-border/50 bg-card p-2.5 touch-none
        ${isDragging ? 'opacity-50 shadow-lg scale-105 z-50' : 'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]'}
      `}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging) {
          onClick();
        }
      }}
    >
      <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 mb-1.5 ${TASK_TYPE_COLORS[task.task_type]}`}>
        <TaskTypeIcon type={task.task_type} />
        {TASK_TYPE_LABELS[task.task_type]}
      </Badge>
      
      <h3 
        className="font-medium text-xs leading-tight text-card-foreground line-clamp-2 mb-1"
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
      >
        {task.title}
      </h3>
      
      <p className="text-[10px] text-muted-foreground line-clamp-1">
        {task.summary}
      </p>
    </Card>
  );
}
