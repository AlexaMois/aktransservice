import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/types/task';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lightbulb, ListTodo, Megaphone, HelpCircle } from 'lucide-react';

interface TaskCardProps {
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

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border-border/50 bg-card p-2.5 overflow-hidden"
      onClick={onClick}
    >
      <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 mb-1.5 ${TASK_TYPE_COLORS[task.task_type]}`}>
        <TaskTypeIcon type={task.task_type} />
        {TASK_TYPE_LABELS[task.task_type]}
      </Badge>
      
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
}
