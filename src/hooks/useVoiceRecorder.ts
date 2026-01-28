/**
 * Hook for voice recording and task creation via STT + AI parsing
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { edgeFetchJson } from '@/shared/api/edgeFetch';
import type { TaskType, ImportanceRating } from '@/entities/task';

export interface ParsedTask {
  title: string;
  summary: string;
  description: string | null;
  task_type: TaskType;
  importance: ImportanceRating;
  due_date: string | null;
}

interface UseVoiceRecorderOptions {
  onTaskParsed: (task: ParsedTask) => void;
}

export function useVoiceRecorder({ onTaskParsed }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use webm for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        if (audioBlob.size < 1000) {
          toast.error('Запись слишком короткая');
          return;
        }

        setIsProcessing(true);

        try {
          // Convert to base64
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          // Step 1: STT
          toast.info('Распознаём речь...');
          const sttResult = await edgeFetchJson<{ text: string; error?: string }>('/stt', {
            method: 'POST',
            body: JSON.stringify({ audio: base64 }),
          });

          if (!sttResult.text) {
            throw new Error(sttResult.error || 'Не удалось распознать речь');
          }

          console.log('STT result:', sttResult.text);

          // Step 2: AI Parse
          toast.info('Анализируем задачу...');
          const parsed = await edgeFetchJson<ParsedTask & { error?: string }>('/ai-task-parser', {
            method: 'POST',
            body: JSON.stringify({ text: sttResult.text }),
          });

          if ('error' in parsed && parsed.error) {
            throw new Error(parsed.error);
          }

          console.log('Parsed task:', parsed);
          
          onTaskParsed(parsed);
          toast.success('Задача распознана!');
        } catch (error) {
          console.error('Voice processing error:', error);
          toast.error(error instanceof Error ? error.message : 'Ошибка обработки голоса');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('🎙️ Говорите...', { duration: 2000 });
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Нет доступа к микрофону');
    }
  }, [onTaskParsed]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
