import { useState } from 'react';
import { TaskPriority, TaskType, EffectType, ImportanceRating, PRIORITY_LABELS, TASK_TYPE_LABELS, EFFECT_TYPE_LABELS, IMPORTANCE_LABELS } from '@/types/task';
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
import { Upload, Loader2, AlertCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToGDrive } from '@/lib/api/gdrive';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    task_type: TaskType;
    author: string;
    priority: TaskPriority;
    effect_type?: EffectType;
    importance?: ImportanceRating;
    input_data_description?: string;
    problem_description?: string;
    file_name?: string;
    file_url?: string;
  }) => void;
}

export function AddTaskModal({ open, onClose, onSubmit }: AddTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'idea' as TaskType,
    author: '',
    priority: 'medium' as TaskPriority,
    effect_type: '' as EffectType | '',
    importance: '' as ImportanceRating | '',
    input_data_description: '',
    problem_description: '',
  });

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
      description: '',
      task_type: 'idea',
      author: '',
      priority: 'medium',
      effect_type: '',
      importance: '',
      input_data_description: '',
      problem_description: '',
    });
    setSelectedFile(null);
    setUploadProgress('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Введите название задачи');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Введите описание задачи');
      return;
    }
    if (!selectedFile) {
      toast.error('Прикрепите файл с входными данными');
      return;
    }
    if (!formData.input_data_description.trim()) {
      toast.error('Опишите входные данные');
      return;
    }
    if (!formData.effect_type) {
      toast.error('Выберите тип эффекта');
      return;
    }
    if (!formData.importance) {
      toast.error('Выберите оценку важности');
      return;
    }
    if (formData.task_type === 'problem' && !formData.problem_description.trim()) {
      toast.error('Опишите проблему');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('uploading');

    try {
      // Upload file to Google Drive
      const uploadResult = await uploadFileToGDrive(selectedFile, formData.title);
      
      if (!uploadResult.success) {
        setUploadProgress('error');
        toast.error(uploadResult.error || 'Ошибка загрузки файла');
        setIsSubmitting(false);
        return;
      }

      setUploadProgress('success');

      onSubmit({
        title: formData.title,
        description: formData.description,
        task_type: formData.task_type,
        author: formData.author || 'Аноним',
        priority: formData.priority,
        effect_type: formData.effect_type || undefined,
        importance: formData.importance || undefined,
        input_data_description: formData.input_data_description,
        problem_description: formData.task_type === 'problem' ? formData.problem_description : undefined,
        file_name: selectedFile.name,
        file_url: uploadResult.fileUrl,
      });

      resetForm();
      onClose();
      
      toast.success('Запись успешно добавлена! Файл загружен в Google Drive.');
    } catch (error) {
      console.error('Submit error:', error);
      setUploadProgress('error');
      toast.error('Произошла ошибка при создании записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Добавить идею / проблему</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task type */}
          <div className="space-y-2">
            <Label>Тип записи <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.task_type === 'idea' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, task_type: 'idea' })}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Идея
              </Button>
              <Button
                type="button"
                variant={formData.task_type === 'problem' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setFormData({ ...formData, task_type: 'problem' })}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Проблема
              </Button>
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
            <Label htmlFor="description">
              Описание <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробное описание"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Автор (имя или отдел)</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Ваше имя или отдел"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип эффекта <span className="text-destructive">*</span></Label>
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
              <Label>Оценка важности <span className="text-destructive">*</span></Label>
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

          <div className="space-y-2">
            <Label>
              Входные данные (файл) <span className="text-destructive">*</span>
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
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
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Нажмите для выбора файла
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input_data_description">
              Описание входных данных <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="input_data_description"
              value={formData.input_data_description}
              onChange={(e) => setFormData({ ...formData, input_data_description: e.target.value })}
              placeholder="Что это за файл и для чего он нужен"
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-chart-1/10 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-chart-5 mt-0.5 shrink-0" />
            <p className="text-chart-5">
              Запись будет создана в статусе «Идеи» и появится на дорожной карте.
            </p>
          </div>

          <DialogFooter>
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
