import { useState, useEffect } from 'react';
import { TaskPriority, TaskType, EffectType, ImportanceRating, DigitizationSection, PRIORITY_LABELS, TASK_TYPE_LABELS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS, DIGITIZATION_SECTION_LABELS } from '@/types/task';
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
import { Upload, Loader2, AlertCircle, Lightbulb, AlertTriangle, ListTodo, Megaphone, Link, HelpCircle } from 'lucide-react';
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
    author: string;
    priority: TaskPriority;
    effect_type?: EffectType;
    importance?: ImportanceRating;
    digitization_section?: DigitizationSection;
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
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
    task_type: defaultTaskType,
    author: '',
    priority: 'medium' as TaskPriority,
    effect_type: '' as EffectType | '',
    importance: '' as ImportanceRating | '',
    digitization_section: 'documents' as DigitizationSection,
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

  const requiresFile = formData.task_type === 'task' || formData.task_type === 'problem';
  const requiresSection = formData.task_type !== 'announcement';

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
      author: '',
      priority: 'medium',
      effect_type: '',
      importance: '',
      digitization_section: 'documents',
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
    if (requiresSection && !formData.digitization_section) {
      toast.error('Выберите раздел цифровизации');
      return;
    }
    if (requiresFile && !selectedFile) {
      toast.error('Прикрепите файл с входными данными');
      return;
    }
    if (requiresFile && !formData.input_data_description.trim()) {
      toast.error('Опишите входные данные');
      return;
    }
    if (formData.task_type === 'problem' && !formData.problem_description.trim()) {
      toast.error('Опишите проблему');
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
        author: formData.author || 'Аноним',
        priority: formData.priority,
        effect_type: formData.effect_type || undefined,
        importance: formData.importance || undefined,
        digitization_section: formData.digitization_section || undefined,
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
          {/* Task type */}
          <div className="space-y-2">
            <Label>Тип записи <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((type) => {
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
              placeholder="Краткое название"
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
              placeholder="Краткое описание в 1–2 предложения"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Кратко опишите, в чём проблема или что нужно улучшить
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Детальное описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание (опционально)"
              rows={3}
            />
          </div>

          {/* Problem description - only for problem type */}
          {formData.task_type === 'problem' && (
            <div className="space-y-2">
              <Label htmlFor="problem_description">
                Описание проблемы <span className="text-destructive">*</span>
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
            <Label htmlFor="url" className="flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Ссылка
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="author">Автор</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Имя или отдел"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Тип эффекта</Label>
              <Select
                value={formData.effect_type}
                onValueChange={(value: EffectType) => setFormData({ ...formData, effect_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EFFECT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Важность</Label>
              <Select
                value={formData.importance}
                onValueChange={(value: ImportanceRating) => setFormData({ ...formData, importance: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите..." />
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
          </div>

          {/* Digitization section - required for all except announcements */}
          {requiresSection && (
            <div className="space-y-2">
              <Label>
                Раздел цифровизации <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.digitization_section}
                onValueChange={(value: DigitizationSection) => setFormData({ ...formData, digitization_section: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите раздел..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIGITIZATION_SECTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                К какой части работы компании относится этот вопрос
              </p>
            </div>
          )}

          {/* File upload - required for tasks and problems */}
          <div className="space-y-2">
            <Label>
              Входные данные (файл) {requiresFile && <span className="text-destructive">*</span>}
            </Label>
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
              Документ, файл или скриншот. Без входных данных задача не берётся в работу
            </p>
          </div>

          {(selectedFile || requiresFile) && (
            <div className="space-y-2">
              <Label htmlFor="input_data_description">
                Описание входных данных {requiresFile && <span className="text-destructive">*</span>}
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
