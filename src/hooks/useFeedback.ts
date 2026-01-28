import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { edgeFetchJson, base64UrlEncodeUtf8 } from '@/shared/api/edgeFetch';
import { getSession } from '@/lib/auth/session';

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
    const session = getSession();
    if (!session) {
      toast({
        title: 'Ошибка',
        description: 'Необходима авторизация',
        variant: 'destructive',
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      let screenshotBase64: string | null = null;
      let screenshotName: string | null = null;

      if (payload.screenshot) {
        screenshotBase64 = await fileToBase64(payload.screenshot);
        screenshotName = payload.screenshot.name;
      }

      const headers: Record<string, string> = {
        'X-App-Session': base64UrlEncodeUtf8(JSON.stringify(session)),
      };

      const response = await edgeFetchJson<FeedbackResponse>('/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          description: payload.description,
          area: payload.area,
          urgency: payload.urgency,
          screenshot_base64: screenshotBase64,
          screenshot_name: screenshotName,
        }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Не удалось отправить фидбэк');
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
