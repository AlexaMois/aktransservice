import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/types/task';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, AlertTriangle, Lightbulb, ListTodo, Megaphone } from 'lucide-react';

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
  };
  const Icon = icons[type];
  return <Icon className="h-3.5 w-3.5" />;
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] border-border/50 bg-card"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="outline" className={`text-xs gap-1 ${TASK_TYPE_COLORS[task.task_type]}`}>
            <TaskTypeIcon type={task.task_type} />
            {TASK_TYPE_LABELS[task.task_type]}
          </Badge>
        </div>
        <h3 className="font-semibold text-sm leading-tight text-card-foreground" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {task.title}
        </h3>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 pt-0 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-1">
          {task.summary}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{task.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
