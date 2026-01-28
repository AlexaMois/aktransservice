import { useState, useEffect } from 'react';
import { TaskType, ImportanceRating, Department, TASK_TYPE_LABELS, IMPORTANCE_LABELS, DEPARTMENT_LABELS } from '@/entities/task';
import { getUserName, isAdmin } from '@/lib/auth/session';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Loader2, AlertCircle, Lightbulb, AlertTriangle, ListTodo, Megaphone, HelpCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToGDrive } from '@/lib/api/gdrive';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    summary: string;
    description?: string;
    task_type: TaskType;
    priority: 'medium';
    importance: ImportanceRating;
    department?: Department;
    url?: string;
    input_data_description?: string;
    problem_description?: string;
    file_name?: string;
    file_url?: string;
  }) => void;
  defaultTaskType?: TaskType;
}

const taskTypeIcons: Record<TaskType, typeof Lightbulb> = {
  idea: Lightbulb,
  problem: AlertTriangle,
  task: ListTodo,
  announcement: Megaphone,
  question: HelpCircle,
};

export function AddTaskModal({ open, onClose, onSubmit, defaultTaskType = 'idea' }: AddTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const userName = getUserName();
  const userIsAdmin = isAdmin();
  
  const [formData, setFormData] = useState<{
    title: string;
    summary: string;
    description: string;
    task_type: TaskType;
    importance: ImportanceRating | null;
    department: Department;
    url: string;
    input_data_description: string;
    problem_description: string;
  }>({
    title: '',
    summary: '',
    description: '',
    task_type: defaultTaskType,
    importance: null,
    department: 'digitization_it',
    url: '',
    input_data_description: '',
    problem_description: '',
  });

  // Update task type when defaultTaskType changes
  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, task_type: defaultTaskType }));
    }
  }, [defaultTaskType, open]);

  const requiresDepartment = formData.task_type !== 'announcement';
  
  // Only admins can create announcements
  const canCreateAnnouncement = userIsAdmin;
  // Filter available task types based on role
  const availableTaskTypes = Object.keys(TASK_TYPE_LABELS).filter(type => {
    if (type === 'announcement') return canCreateAnnouncement;
    return true;
  }) as TaskType[];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress('idle');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      description: '',
      task_type: defaultTaskType,
      importance: null,
      department: 'digitization_it',
      url: '',
      input_data_description: '',
      problem_description: '',
    });
    setSelectedFile(null);
    setUploadProgress('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Введите название');
      return;
    }
    if (!formData.summary.trim()) {
      toast.error('Введите суть записи');
      return;
    }
    if (!formData.importance) {
      toast.error('Выберите важность');
      return;
    }
    if (requiresDepartment && !formData.department) {
      toast.error('Выберите отдел');
      return;
    }

    setIsSubmitting(true);
    
    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (selectedFile) {
      setUploadProgress('uploading');
      try {
        const uploadResult = await uploadFileToGDrive(selectedFile, formData.title);
        
        if (!uploadResult.success) {
          setUploadProgress('error');
          toast.error(uploadResult.error || 'Ошибка загрузки файла');
          setIsSubmitting(false);
          return;
        }

        setUploadProgress('success');
        fileUrl = uploadResult.fileUrl;
        fileName = selectedFile.name;
      } catch (error) {
        setUploadProgress('error');
        toast.error('Ошибка загрузки файла');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      onSubmit({
        title: formData.title,
        summary: formData.summary,
        description: formData.description || undefined,
        task_type: formData.task_type,
        priority: 'medium',
        importance: formData.importance as ImportanceRating,
        department: formData.department || undefined,
        url: formData.url || undefined,
        input_data_description: formData.input_data_description || undefined,
        problem_description: formData.task_type === 'problem' ? formData.problem_description : undefined,
        file_name: fileName,
        file_url: fileUrl,
      });

      resetForm();
      onClose();
      
      toast.success('Запись успешно добавлена!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Произошла ошибка при создании записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Добавить запись</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Author display (read-only) */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Автор:</span>
            <span className="text-sm font-medium">{userName}</span>
          </div>

          {/* Task type */}
          <div className="space-y-2">
            <Label>Тип записи <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {availableTaskTypes.map((type) => {
                const Icon = taskTypeIcons[type];
                const isSelected = formData.task_type === type;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={isSelected ? (type === 'problem' ? 'destructive' : 'default') : 'outline'}
                    className="justify-start gap-2 text-xs sm:text-sm"
                    onClick={() => setFormData({ ...formData, task_type: type })}
                  >
                    <Icon className="h-4 w-4" />
                    {TASK_TYPE_LABELS[type]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Коротко и понятно, о чём речь"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">
              Суть <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Короткое описание"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Опишите в 1–2 предложениях, что именно предлагается или в чём проблема
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Детальное описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробности (при необходимости)"
              rows={3}
            />
          </div>

          {/* Problem description - only for problem type */}
          {formData.task_type === 'problem' && (
            <div className="space-y-2">
              <Label htmlFor="problem_description">
                Описание проблемы
              </Label>
              <Textarea
                id="problem_description"
                value={formData.problem_description}
                onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                placeholder="Что именно мешает работать сейчас?"
                rows={2}
              />
            </div>
          )}

          {/* URL field */}
          <div className="space-y-2">
            <Label htmlFor="url">Ссылка</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Importance - simplified 1-2-3 */}
          <div className="space-y-2">
            <Label>
              Важность <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.importance}
              onValueChange={(value: ImportanceRating) => setFormData({ ...formData, importance: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите важность..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMPORTANCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department - required for all except announcements */}
          {requiresDepartment && (
            <div className="space-y-2">
              <Label>
                Отдел <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.department}
                onValueChange={(value: Department) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите отдел..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File upload - optional */}
          <div className="space-y-2">
            <Label>Файл</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Upload className="h-5 w-5" />
                    <span className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Нажмите для выбора файла
                    </p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Документ, файл или скриншот — при наличии
            </p>
          </div>

          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="input_data_description">
                Описание файла
              </Label>
              <Textarea
                id="input_data_description"
                value={formData.input_data_description}
                onChange={(e) => setFormData({ ...formData, input_data_description: e.target.value })}
                placeholder="Что это за файл и для чего он нужен"
                rows={2}
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-chart-1/10 rounded-lg text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 text-chart-5 mt-0.5 shrink-0" />
            <p className="text-chart-5">
              Запись будет создана в статусе «Идеи» и появится на дорожной карте.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                'Добавить'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}