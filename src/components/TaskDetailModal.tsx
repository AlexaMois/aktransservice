import { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, STATUS_LABELS, TASK_TYPE_LABELS, TASK_TYPE_COLORS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS, DIGITIZATION_SECTION_LABELS } from '@/types/task';
import { useTaskComments } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, User, Calendar, ExternalLink, Clock, MessageSquare, Link2, AlertTriangle, Lightbulb, Send, CheckCircle, ListTodo, Megaphone, LinkIcon, ClipboardList, CalendarPlus, Save, Loader2, HelpCircle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  allTasks?: Task[];
  onTaskUpdate?: (updatedTask: Task) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<Task>;
}

const statusVariants: Record<string, string> = {
  'ideas': 'bg-chart-3/20 text-chart-5 border-chart-3/30',
  'planned': 'bg-chart-1/20 text-chart-5 border-chart-1/30',
  'in-progress': 'bg-primary/20 text-primary border-primary/30',
  'review': 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  'completed': 'bg-green-500/20 text-green-700 border-green-500/30',
};

const importanceVariants: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  important: 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  can_wait: 'bg-muted text-muted-foreground border-muted',
};

const TaskTypeIcon = ({ type }: { type: Task['task_type'] }) => {
  const icons = {
    idea: Lightbulb,
    problem: AlertTriangle,
    task: ListTodo,
    announcement: Megaphone,
    question: HelpCircle,
  };
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
};

export function TaskDetailModal({ task, open, onClose, allTasks = [], onTaskUpdate, onUpdateTask }: TaskDetailModalProps) {
  const { comments, loading: commentsLoading, addComment } = useTaskComments(task?.id || '');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [executionLog, setExecutionLog] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [isEditingLog, setIsEditingLog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const logTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when task changes
  useEffect(() => {
    if (task && !isEditingLog) {
      setExecutionLog(task.execution_log || '');
    }
  }, [task?.id, task?.execution_log, isEditingLog]);

  if (!task) return null;

  const linkedIdea = task.linked_idea_id ? allTasks.find(t => t.id === task.linked_idea_id) : null;
  const linkedProblem = task.linked_problem_id ? allTasks.find(t => t.id === task.linked_problem_id) : null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!onUpdateTask || newStatus === task.status) return;
    
    setUpdatingStatus(true);
    try {
      const updatedTask = await onUpdateTask(task.id, { status: newStatus });
      toast.success(`Статус изменён на "${STATUS_LABELS[newStatus]}"`);
      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка при изменении статуса');
    } finally {
      setUpdatingStatus(false);
    }
  };

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

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const handleInsertDate = () => {
    const dateStr = formatDate() + ' — ';
    const textarea = logTextareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = executionLog.substring(0, start) + dateStr + executionLog.substring(end);
      setExecutionLog(newValue);
      setIsEditingLog(true);
      
      // Set cursor position after the inserted date
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + dateStr.length, start + dateStr.length);
      }, 0);
    } else {
      // If no textarea yet, prepend to the log
      const newValue = executionLog ? dateStr + '\n' + executionLog : dateStr;
      setExecutionLog(newValue);
      setIsEditingLog(true);
    }
  };

  const handleSaveLog = async () => {
    setSavingLog(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ execution_log: executionLog })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;

      setIsEditingLog(false);
      toast.success('Лог сохранён');
      
      if (onTaskUpdate && data) {
        onTaskUpdate(data as Task);
      }
    } catch (error) {
      console.error('Error saving log:', error);
      toast.error('Ошибка при сохранении лога');
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${TASK_TYPE_COLORS[task.task_type].replace('text-', 'bg-').split(' ')[0]}`}>
              <TaskTypeIcon type={task.task_type} />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-left pr-6">
              {task.title}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3">
            {/* Status selector */}
            <Select
              value={task.status}
              onValueChange={(value) => handleStatusChange(value as TaskStatus)}
              disabled={updatingStatus || !onUpdateTask}
            >
              <SelectTrigger className={`h-7 w-auto min-w-[130px] text-xs ${statusVariants[task.status]}`}>
                {updatingStatus ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Обновление...</span>
                  </div>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ideas">{STATUS_LABELS['ideas']}</SelectItem>
                <SelectItem value="planned">{STATUS_LABELS['planned']}</SelectItem>
                <SelectItem value="in-progress">{STATUS_LABELS['in-progress']}</SelectItem>
                <SelectItem value="review">{STATUS_LABELS['review']}</SelectItem>
                <SelectItem value="completed">{STATUS_LABELS['completed']}</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className={`text-xs ${TASK_TYPE_COLORS[task.task_type]}`}>
              {TASK_TYPE_LABELS[task.task_type]}
            </Badge>
            {task.importance && (
              <Badge variant="outline" className={`text-xs ${importanceVariants[task.importance]}`}>
                {IMPORTANCE_LABELS[task.importance]}
              </Badge>
            )}
            {task.effect_type && (
              <Badge variant="secondary" className="text-xs">
                {EFFECT_TYPE_LABELS[task.effect_type]}
              </Badge>
            )}
            {task.digitization_section && (
              <Badge variant="outline" className="text-xs gap-1">
                <FolderOpen className="h-3 w-3" />
                {DIGITIZATION_SECTION_LABELS[task.digitization_section]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5 mt-2">
          {/* Summary */}
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">Суть</h4>
            <p className="text-sm sm:text-base text-foreground">{task.summary}</p>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">Детальное описание</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Problem description for problem type */}
          {task.task_type === 'problem' && task.problem_description && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 sm:p-4">
              <h4 className="text-xs sm:text-sm font-medium text-destructive mb-1.5 sm:mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Описание проблемы
              </h4>
              <p className="text-sm text-foreground">{task.problem_description}</p>
            </div>
          )}

          {/* URL */}
          {task.url && (
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                Ссылка
              </h4>
              <a 
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all flex items-center gap-1"
              >
                {task.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          )}

          <Separator />

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Автор</p>
                <p className="text-xs sm:text-sm font-medium truncate">{task.author}</p>
              </div>
            </div>
            
            {task.owner && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Владелец</p>
                  <p className="text-xs sm:text-sm font-medium truncate">{task.owner}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Создано</p>
                <p className="text-xs sm:text-sm font-medium">{new Date(task.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Обновлено</p>
                <p className="text-xs sm:text-sm font-medium">{new Date(task.updated_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
          </div>

          {/* Linked items */}
          {(linkedIdea || linkedProblem) && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Связанные записи
                </h4>
                <div className="space-y-2">
                  {linkedIdea && (
                    <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
                      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">Идея: {linkedIdea.title}</span>
                    </div>
                  )}
                  {linkedProblem && (
                    <div className="flex items-start gap-2 p-2 bg-destructive/5 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">Проблема: {linkedProblem.title}</span>
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
                <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2">Входные данные</h4>
                <p className="text-sm text-foreground mb-3">{task.input_data_description}</p>
                
                {task.file_url && task.file_name && (
                  <a 
                    href={task.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate max-w-[200px]">{task.file_name}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                )}
              </div>
            </>
          )}

          {/* Execution Log */}
          <Separator />
          <div className="bg-muted/30 border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h4 className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Ход выполнения / Лог
              </h4>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInsertDate}
                  className="h-7 text-xs gap-1.5"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Вставить дату</span>
                </Button>
                {isEditingLog && (
                  <Button
                    size="sm"
                    onClick={handleSaveLog}
                    disabled={savingLog}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Сохранить</span>
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              ref={logTextareaRef}
              value={executionLog}
              onChange={(e) => {
                setExecutionLog(e.target.value);
                setIsEditingLog(true);
              }}
              placeholder="Формат: ДД.ММ.ГГГГ — действие — результат"
              className="min-h-[120px] font-mono text-xs sm:text-sm leading-relaxed resize-y"
              rows={6}
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              Рекомендуемый формат: Дата — действие — результат
            </p>
          </div>

          {/* Result block for completed tasks */}
          {task.status === 'completed' && (task.result_before || task.result_action || task.result_after) && (
            <>
              <Separator />
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs sm:text-sm font-medium text-green-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Результат
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {task.result_before && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что было</p>
                      <p className="text-xs sm:text-sm">{task.result_before}</p>
                    </div>
                  )}
                  {task.result_action && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что сделали</p>
                      <p className="text-xs sm:text-sm">{task.result_action}</p>
                    </div>
                  )}
                  {task.result_after && (
                    <div>
                      <p className="text-xs text-muted-foreground">Что изменилось</p>
                      <p className="text-xs sm:text-sm">{task.result_after}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Comments section */}
          <Separator />
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Комментарии ({comments.length})
            </h4>
            
            {/* Add comment form */}
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Ваше имя (необязательно)"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Textarea
                  placeholder="Написать комментарий..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm"
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
            <div className="space-y-2 sm:space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-accent/50 rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs sm:text-sm">{comment.author}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground">{comment.text}</p>
                </div>
              ))}
              {comments.length === 0 && !commentsLoading && (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-2">
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
