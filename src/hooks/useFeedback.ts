import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { getStableUserId, getDisplayName } from '@/lib/appMode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface FeedbackPayload {
  type: string;
  title: string;
  description: string;
  area: string;
  urgency: string | null;
  screenshot: File | null;
}

interface FeedbackResponse {
  success: boolean;
  error?: string;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (payload: FeedbackPayload): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      let screenshotBase64: string | null = null;
      let screenshotName: string | null = null;

      if (payload.screenshot) {
        screenshotBase64 = await fileToBase64(payload.screenshot);
        screenshotName = payload.screenshot.name;
      }

      // Use stable user identity from appMode
      const userId = getStableUserId();
      const displayName = getDisplayName();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          description: payload.description,
          area: payload.area,
          urgency: payload.urgency,
          screenshot_base64: screenshotBase64,
          screenshot_name: screenshotName,
          // Include user identity
          user_id: userId,
          user_name: displayName,
        }),
      });

      const text = await response.text();
      let result: FeedbackResponse;
      
      try {
        result = text ? JSON.parse(text) : { success: false };
      } catch {
        throw new Error(`Ошибка сервера (${response.status})`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Не удалось отправить фидбэк');
      }

      toast({
        title: 'Фидбэк отправлен',
        description: 'Спасибо за ваш отзыв!',
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        title: 'Ошибка',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitFeedback, isSubmitting };
}
