/**
 * Voice recording button for creating tasks via speech
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if browser supports media devices
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(supported);
  }, []);

  const button = (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={onClick}
      disabled={isProcessing || !isSupported}
      className={cn(
        "relative",
        isRecording && "animate-pulse",
        !isSupported && "opacity-50 cursor-not-allowed",
        className
      )}
      title={
        !isSupported 
          ? "Браузер не поддерживает запись голоса" 
          : isRecording 
            ? "Остановить запись" 
            : "Записать голосом"
      }
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : !isSupported ? (
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
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

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>Браузер не поддерживает запись голоса.</p>
            <p className="text-xs text-muted-foreground">Используйте Chrome, Firefox или Safari.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}