import { Task, PRIORITY_LABELS, TASK_TYPE_LABELS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS } from '@/types/task';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Calendar, ExternalLink, AlertTriangle, Lightbulb } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const priorityVariants: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  low: 'bg-muted text-muted-foreground border-muted',
};

const importanceVariants: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  important: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  can_wait: 'bg-muted text-muted-foreground border-muted',
};

const taskTypeVariants: Record<string, string> = {
  idea: 'bg-primary/10 text-primary border-primary/20',
  problem: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-border/50 bg-card"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            {task.task_type === 'problem' ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Lightbulb className="h-4 w-4 text-primary" />
            )}
            <Badge variant="outline" className={`text-xs ${taskTypeVariants[task.task_type]}`}>
              {TASK_TYPE_LABELS[task.task_type]}
            </Badge>
          </div>
          {task.importance && (
            <Badge variant="outline" className={`shrink-0 text-xs ${importanceVariants[task.importance]}`}>
              {IMPORTANCE_LABELS[task.importance]}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-tight text-card-foreground line-clamp-2">
          {task.title}
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
        
        {task.effect_type && (
          <Badge variant="secondary" className="text-xs">
            {EFFECT_TYPE_LABELS[task.effect_type]}
          </Badge>
        )}
        
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.author}</span>
            {task.owner && (
              <>
                <span className="text-border">→</span>
                <span className="text-foreground font-medium">{task.owner}</span>
              </>
            )}
          </div>
          
          {task.file_name && (
            <div className="flex items-center gap-1.5 text-primary">
              <FileText className="h-3 w-3" />
              <span className="truncate">{task.file_name}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
