/**
 * Component for linking Telegram account to receive task reminders
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageCircle, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/lib/auth/session';

interface TelegramLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TelegramLinkDialog({ open, onClose }: TelegramLinkDialogProps) {
  const [telegramId, setTelegramId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  const handleSubmit = async () => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Пользователь не авторизован');
      return;
    }

    if (!telegramId.trim()) {
      toast.error('Введите Telegram ID');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('user_telegram')
        .upsert({
          user_id: userId,
          telegram_user_id: telegramId.trim(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setIsLinked(true);
      toast.success('Telegram успешно привязан!');
      
      setTimeout(() => {
        onClose();
        setIsLinked(false);
        setTelegramId('');
      }, 1500);
    } catch (error) {
      console.error('Failed to link Telegram:', error);
      toast.error('Ошибка привязки Telegram');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Привязать Telegram
          </DialogTitle>
          <DialogDescription>
            Получайте напоминания о задачах в Telegram за 10 минут до дедлайна.
          </DialogDescription>
        </DialogHeader>

        {isLinked ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Telegram привязан!</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-id">Ваш Telegram ID</Label>
              <Input
                id="telegram-id"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="123456789"
              />
              <p className="text-xs text-muted-foreground">
                Чтобы узнать ID, напишите боту{' '}
                <a 
                  href="https://t.me/userinfobot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @userinfobot
                </a>
                {' '}в Telegram
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLinked}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Привязать'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
