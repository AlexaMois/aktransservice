import { useState } from 'react';
import { TaskPriority, PRIORITY_LABELS } from '@/types/task';
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
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    author: string;
    priority: TaskPriority;
    inputDataDescription: string;
    fileName?: string;
    fileUrl?: string;
    comment?: string;
  }) => void;
}

export function AddTaskModal({ open, onClose, onSubmit }: AddTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    priority: 'medium' as TaskPriority,
    inputDataDescription: '',
    comment: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
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
    if (!formData.inputDataDescription.trim()) {
      toast.error('Опишите входные данные');
      return;
    }

    setIsSubmitting(true);

    // Simulate file upload (will be replaced with Google Drive integration)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSubmit({
      ...formData,
      fileName: selectedFile.name,
      fileUrl: '#', // Will be replaced with actual Google Drive URL
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      author: '',
      priority: 'medium',
      inputDataDescription: '',
      comment: '',
    });
    setSelectedFile(null);
    setIsSubmitting(false);
    onClose();
    
    toast.success('Идея успешно добавлена!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Добавить идею / задачу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Название задачи <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Краткое название задачи"
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
              placeholder="Подробное описание задачи или идеи"
              rows={3}
            />
          </div>

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
            <Label htmlFor="inputDataDescription">
              Описание входных данных <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="inputDataDescription"
              value={formData.inputDataDescription}
              onChange={(e) => setFormData({ ...formData, inputDataDescription: e.target.value })}
              placeholder="Что это за файл и для чего он нужен"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий (необязательно)</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Дополнительные заметки"
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-chart-1/10 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-chart-5 mt-0.5 shrink-0" />
            <p className="text-chart-5">
              Задача будет создана в статусе «Идеи» и появится на дорожной карте после модерации.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                'Добавить идею'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
