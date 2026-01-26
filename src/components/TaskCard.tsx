import { Task, PRIORITY_LABELS } from '@/types/task';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Calendar, ExternalLink } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const priorityVariants: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  low: 'bg-muted text-muted-foreground border-muted',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-border/50 bg-card"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight text-card-foreground line-clamp-2">
            {task.title}
          </h3>
          <Badge 
            variant="outline" 
            className={`shrink-0 text-xs ${priorityVariants[task.priority]}`}
          >
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
        
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
          
          {task.fileName && (
            <div className="flex items-center gap-1.5 text-primary">
              <FileText className="h-3 w-3" />
              <span className="truncate">{task.fileName}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{task.createdAt.toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
