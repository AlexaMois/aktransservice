import { useState } from 'react';
import { Task, STATUS_LABELS, PRIORITY_LABELS, TASK_TYPE_LABELS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS } from '@/types/task';
import { useTasks, useTaskComments } from '@/hooks/useTasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, User, Calendar, ExternalLink, Clock, MessageSquare, Link2, AlertTriangle, Lightbulb, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  allTasks?: Task[];
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

const importanceVariants: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  important: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  can_wait: 'bg-muted text-muted-foreground border-muted',
};

export function TaskDetailModal({ task, open, onClose, allTasks = [] }: TaskDetailModalProps) {
  const { comments, loading: commentsLoading, addComment } = useTaskComments(task?.id || '');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  if (!task) return null;

  const linkedIdea = task.linked_idea_id ? allTasks.find(t => t.id === task.linked_idea_id) : null;
  const linkedProblem = task.linked_problem_id ? allTasks.find(t => t.id === task.linked_problem_id) : null;

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error('Введите текст комментария');
      return;
    }
    
    setSubmittingComment(true);
    try {
      await addComment(commentAuthor || 'Аноним', commentText);
      setCommentText('');
      toast.success('Комментарий добавлен');
    } catch (error) {
      toast.error('Ошибка при добавлении комментария');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 justify-between">
            <div className="flex items-center gap-2">
              {task.task_type === 'problem' ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Lightbulb className="h-5 w-5 text-primary" />
              )}
              <DialogTitle className="text-xl font-semibold text-left pr-4">
                {task.title}
              </DialogTitle>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className={statusVariants[task.status]}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge variant="outline">
              {TASK_TYPE_LABELS[task.task_type]}
            </Badge>
            {task.importance && (
              <Badge variant="outline" className={importanceVariants[task.importance]}>
                {IMPORTANCE_LABELS[task.importance]}
              </Badge>
            )}
            {task.effect_type && (
              <Badge variant="secondary">
                {EFFECT_TYPE_LABELS[task.effect_type]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Описание</h4>
            <p className="text-foreground">{task.description}</p>
          </div>

          {/* Problem description for problem type */}
          {task.task_type === 'problem' && task.problem_description && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Описание проблемы
              </h4>
              <p className="text-foreground">{task.problem_description}</p>
            </div>
          )}

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
                <p className="text-sm font-medium">{new Date(task.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Обновлено</p>
                <p className="text-sm font-medium">{new Date(task.updated_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
          </div>

          {/* Linked items */}
          {(linkedIdea || linkedProblem) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Связанные записи
                </h4>
                <div className="space-y-2">
                  {linkedIdea && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-sm">Идея: {linkedIdea.title}</span>
                    </div>
                  )}
                  {linkedProblem && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Проблема: {linkedProblem.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Input data */}
          {task.input_data_description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Входные данные</h4>
                <p className="text-foreground mb-3">{task.input_data_description}</p>
                
                {task.file_url && task.file_name && (
                  <a 
                    href={task.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{task.file_name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </>
          )}

          {/* Result block for completed tasks */}
          {task.status === 'completed' && (task.result_before || task.result_action || task.result_after) && (
            <>
              <Separator />
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Результат
                </h4>
                <div className="space-y-3">
                  {task.result_before && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что было</p>
                      <p className="text-sm">{task.result_before}</p>
                    </div>
                  )}
                  {task.result_action && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что сделали</p>
                      <p className="text-sm">{task.result_action}</p>
                    </div>
                  )}
                  {task.result_after && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что изменилось</p>
                      <p className="text-sm">{task.result_after}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Comments section */}
          <Separator />
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Комментарии ({comments.length})
            </h4>
            
            {/* Add comment form */}
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Ваше имя (необязательно)"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
              />
              <div className="flex gap-2">
                <Textarea
                  placeholder="Написать комментарий..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={submittingComment || !commentText.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-accent/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.text}</p>
                </div>
              ))}
              {comments.length === 0 && !commentsLoading && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Комментариев пока нет
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
