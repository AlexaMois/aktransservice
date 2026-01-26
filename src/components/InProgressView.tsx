import { Task, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS, TASK_TYPE_LABELS } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

interface InProgressViewProps {
  tasks: Task[];
  loading: boolean;
  onTaskClick: (task: Task) => void;
}

export function InProgressView({ tasks, loading, onTaskClick }: InProgressViewProps) {
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (inProgressTasks.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="h-16 w-16 mx-auto text-muted-foreground mb-4 rounded-full bg-muted flex items-center justify-center">
          <Zap className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Нет задач в работе</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Задачи появятся здесь, когда будут переведены в статус «В разработке».
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {inProgressTasks.map((task) => (
        <Card 
          key={task.id} 
          className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          onClick={() => onTaskClick(task)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {task.task_type === 'problem' ? (
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Lightbulb className="h-4 w-4 text-primary shrink-0" />
              )}
              <Badge variant="outline" className="text-xs">
                {TASK_TYPE_LABELS[task.task_type]}
              </Badge>
              {task.importance && (
                <Badge variant="secondary" className="text-xs">
                  {IMPORTANCE_LABELS[task.importance]}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
            
            {task.effect_type && (
              <Badge variant="secondary" className="text-xs mb-3">
                {EFFECT_TYPE_LABELS[task.effect_type]}
              </Badge>
            )}
            
            {task.owner && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium truncate">{task.owner}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
