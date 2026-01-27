import { memo } from 'react';
import { Task, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, AlertTriangle, Lightbulb, Zap, ListTodo, Megaphone } from 'lucide-react';
import { getImportanceStyles } from '@/lib/importanceUtils';

interface InProgressViewProps {
  tasks: Task[];
  loading: boolean;
  onTaskClick: (task: Task) => void;
}

const TaskTypeIcon = ({ type }: { type: Task['task_type'] }) => {
  const icons = {
    idea: Lightbulb,
    problem: AlertTriangle,
    task: ListTodo,
    announcement: Megaphone,
  };
  const Icon = icons[type];
  return <Icon className="h-4 w-4" />;
};

export function InProgressView({ tasks, loading, onTaskClick }: InProgressViewProps) {
  // Filter only in-progress tasks and exclude announcements
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress' && t.task_type !== 'announcement');

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
      {inProgressTasks.map((task) => {
        const importanceStyles = getImportanceStyles(task.importance);
        return (
          <Card 
            key={task.id} 
            className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${importanceStyles.borderClass}`}
            onClick={() => onTaskClick(task)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={`text-xs gap-1 ${TASK_TYPE_COLORS[task.task_type]}`}>
                  <TaskTypeIcon type={task.task_type} />
                  {TASK_TYPE_LABELS[task.task_type]}
                </Badge>
                <Badge variant="outline" className={`text-xs font-bold ${importanceStyles.badgeClass}`}>
                  {importanceStyles.label}
                </Badge>
              </div>
              <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.summary}</p>
              
              {task.owner && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{task.owner}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
