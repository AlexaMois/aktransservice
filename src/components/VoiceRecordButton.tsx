/**
 * Voice recording button for creating tasks via speech
 */

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
  className?: string;
}

export function VoiceRecordButton({ 
  isRecording, 
  isProcessing, 
  onClick,
  className 
}: VoiceRecordButtonProps) {
  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={onClick}
      disabled={isProcessing}
      className={cn(
        "relative",
        isRecording && "animate-pulse",
        className
      )}
      title={isRecording ? "Остановить запись" : "Записать голосом"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {isRecording && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-ping" />
      )}
    </Button>
  );
}
