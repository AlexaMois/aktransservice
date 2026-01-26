import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS, DIGITIZATION_SECTION_LABELS } from '@/types/task';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, AlertTriangle, Lightbulb, ListTodo, Megaphone, HelpCircle, FolderOpen } from 'lucide-react';

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
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border-border/50 bg-card"
      onClick={onClick}
    >
      <CardHeader className="pb-1.5 pt-2 px-2.5">
        <div className="flex items-center gap-1 mb-1">
          <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 ${TASK_TYPE_COLORS[task.task_type]}`}>
            <TaskTypeIcon type={task.task_type} />
            {TASK_TYPE_LABELS[task.task_type]}
          </Badge>
        </div>
        <h3 
          className="font-medium text-xs leading-tight text-card-foreground line-clamp-2"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {task.title}
        </h3>
      </CardHeader>
      <CardContent className="px-2.5 pb-2 pt-0 space-y-1">
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {task.summary}
        </p>
        
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <FolderOpen className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{DIGITIZATION_SECTION_LABELS[task.digitization_section || 'documents']}</span>
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{task.author}</span>
        </div>
      </CardContent>
    </Card>
  );
}
