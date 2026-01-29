import { useState, useRef } from 'react';
import { MessageSquarePlus, Upload, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useFeedback } from '@/hooks/useFeedback';

const FEEDBACK_TYPES = [
  { value: 'error', label: 'Ошибка' },
  { value: 'idea', label: 'Идея / улучшение' },
  { value: 'unclear', label: 'Непонятно как пользоваться' },
  { value: 'other', label: 'Другое' },
];

const FEEDBACK_AREAS = [
  { value: 'kanban', label: 'Канбан' },
  { value: 'personal_task', label: 'Личная задача' },
  { value: 'voice_input', label: 'Голосовой ввод' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'other', label: 'Другое' },
];

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Срочно' },
  { value: 'can_wait', label: 'Можно позже' },
];

interface FeedbackFormData {
  type: string;
  title: string;
  description: string;
  area: string;
  urgency: string;
  screenshot: File | null;
}

const initialFormData: FeedbackFormData = {
  type: '',
  title: '',
  description: '',
  area: '',
  urgency: '',
  screenshot: null,
};

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { submitFeedback, isSubmitting } = useFeedback();

  const isValid = formData.type && formData.title.trim() && formData.description.trim() && formData.area;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, screenshot: file }));
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeScreenshot = () => {
    setFormData(prev => ({ ...prev, screenshot: null }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    const success = await submitFeedback({
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description.trim(),
      area: formData.area,
      urgency: formData.urgency || null,
      screenshot: formData.screenshot,
    });

    if (success) {
      setFormData(initialFormData);
      removeScreenshot();
      setOpen(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setFormData(initialFormData);
      removeScreenshot();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          <span>Оставить фидбэк</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оставить фидбэк</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Тип фидбэка *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="feedback-type">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="feedback-title">Краткий заголовок *</Label>
            <Input
              id="feedback-title"
              placeholder="Опишите кратко..."
              maxLength={150}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.title.length}/150
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="feedback-description">Описание проблемы / идеи *</Label>
            <Textarea
              id="feedback-description"
              placeholder="Подробнее опишите ситуацию..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label htmlFor="feedback-area">Где возникло *</Label>
            <Select
              value={formData.area}
              onValueChange={(value) => setFormData(prev => ({ ...prev, area: value }))}
            >
              <SelectTrigger id="feedback-area">
                <SelectValue placeholder="Выберите раздел" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_AREAS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgency (optional) */}
          <div className="space-y-2">
            <Label htmlFor="feedback-urgency">Срочность</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
            >
              <SelectTrigger id="feedback-urgency">
                <SelectValue placeholder="Не указано" />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Screenshot (optional) */}
          <div className="space-y-2">
            <Label>Скриншот</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-40 object-contain rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeScreenshot}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Загрузить скриншот
              </Button>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Отправка...
              </>
            ) : (
              'Отправить'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
