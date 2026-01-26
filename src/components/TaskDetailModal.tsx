import { Task, STATUS_LABELS, PRIORITY_LABELS } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Calendar, ExternalLink, Clock, MessageSquare } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const priorityVariants: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  low: 'bg-muted text-muted-foreground border-muted',
};

const statusVariants: Record<string, string> = {
  'ideas': 'bg-chart-3/20 text-chart-5 border-chart-3/30',
  'planned': 'bg-chart-1/20 text-chart-5 border-chart-1/30',
  'in-progress': 'bg-primary/20 text-primary border-primary/30',
  'completed': 'bg-green-500/20 text-green-700 border-green-500/30',
};

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 justify-between">
            <DialogTitle className="text-xl font-semibold text-left pr-4">
              {task.title}
            </DialogTitle>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline" className={statusVariants[task.status]}>
                {STATUS_LABELS[task.status]}
              </Badge>
              <Badge variant="outline" className={priorityVariants[task.priority]}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Описание</h4>
            <p className="text-foreground">{task.description}</p>
          </div>

          <Separator />

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Автор</p>
                <p className="text-sm font-medium">{task.author}</p>
              </div>
            </div>
            
            {task.owner && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Владелец</p>
                  <p className="text-sm font-medium">{task.owner}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Создано</p>
                <p className="text-sm font-medium">{task.createdAt.toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Обновлено</p>
                <p className="text-sm font-medium">{task.updatedAt.toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Input data */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Входные данные</h4>
            <p className="text-foreground mb-3">{task.inputDataDescription}</p>
            
            {task.fileUrl && task.fileName && (
              <a 
                href={task.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="font-medium">{task.fileName}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Comments section */}
          {task.comments.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Комментарии ({task.comments.length})
                </h4>
                <div className="space-y-3">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="bg-accent/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt.toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
