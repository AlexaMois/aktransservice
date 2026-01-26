import { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Calendar, User, Save, X, Loader2, RefreshCw, Edit2, Eye } from 'lucide-react';
import { LinkifiedText } from '@/components/LinkifiedText';
import { formatAnnouncementText } from '@/lib/formatAnnouncementText';
import { toast } from 'sonner';

interface AnnouncementDetailModalProps {
  announcement: Task | null;
  open: boolean;
  onClose: () => void;
  onSave?: (id: string, updates: Partial<Task>) => Promise<Task>;
  isNew?: boolean;
}

export function AnnouncementDetailModal({ 
  announcement, 
  open, 
  onClose, 
  onSave,
  isNew = false,
}: AnnouncementDetailModalProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  
  // Reset form when announcement changes
  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setSummary(announcement.summary);
      setDescription(announcement.description || '');
    }
    setIsEditing(isNew);
    setSaveError(null);
  }, [announcement, isNew]);
  
  const handleSave = async () => {
    if (!announcement || !onSave) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Auto-format text before saving
      const formattedSummary = formatAnnouncementText(summary);
      const formattedDescription = formatAnnouncementText(description);
      
      await onSave(announcement.id, {
        title: title.trim(),
        summary: formattedSummary,
        description: formattedDescription || null,
      });
      
      toast.success('Объявление сохранено');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
      setSaveError('Сохранение не выполнено. Проверьте соединение и попробуйте ещё раз.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (announcement) {
      // Reset to original values
      setTitle(announcement.title);
      setSummary(announcement.summary);
      setDescription(announcement.description || '');
    }
    setSaveError(null);
    setIsEditing(false);
    
    if (isNew) {
      onClose();
    }
  };
  
  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };
  
  if (!announcement) return null;
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Заголовок объявления"
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle className="text-lg break-words" style={{ wordBreak: 'break-word' }}>
                  {announcement.title}
                </DialogTitle>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(announcement.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {announcement.author && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{announcement.author}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Summary */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Суть объявления
              </Label>
              {isEditing ? (
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Краткое описание объявления..."
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <div className="text-foreground whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <LinkifiedText text={announcement.summary} />
                </div>
              )}
            </div>
            
            {/* Description */}
            {(isEditing || announcement.description) && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Подробное описание
                </Label>
                {isEditing ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Детальное описание, инструкции, списки..."
                    rows={10}
                    className="resize-none"
                  />
                ) : (
                  <div className="text-foreground whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <LinkifiedText text={announcement.description || ''} />
                  </div>
                )}
              </div>
            )}
            
            {/* Error message */}
            {saveError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{saveError}</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer with actions */}
        <div className="px-4 sm:px-6 py-4 border-t bg-muted/30 flex items-center justify-between gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Отмена
              </Button>
              <div className="flex items-center gap-2">
                {saveError && (
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Повторить
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim() || !summary.trim()}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Сохранить
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="gap-2"
              >
                Закрыть
              </Button>
              {onSave && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Редактировать
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
