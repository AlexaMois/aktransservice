import { RefreshCw, Check, AlertCircle, Cloud } from 'lucide-react';
import { SyncStatus } from '@/hooks/useSyncStatus';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncTime: Date | null;
  error?: string | null;
  onManualSync?: () => void;
  pollingInterval?: number;
}

export function SyncStatusIndicator({
  status,
  lastSyncTime,
  error,
  onManualSync,
  pollingInterval = 30000,
}: SyncStatusIndicatorProps) {
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Никогда';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return 'Только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <Check className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'syncing':
        return 'text-primary';
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };
  
  const getTooltipContent = () => {
    const intervalMinutes = Math.floor(pollingInterval / 60000);
    const intervalText = intervalMinutes >= 1 
      ? `каждые ${intervalMinutes} мин.` 
      : `каждые ${pollingInterval / 1000} сек.`;
    
    if (status === 'error') {
      return `Ошибка: ${error || 'Не удалось синхронизировать'}`;
    }
    
    if (status === 'syncing') {
      return 'Синхронизация...';
    }
    
    return `Синхронизация с Google Sheets (${intervalText})\nПоследняя: ${formatLastSync(lastSyncTime)}`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-2 h-8 px-2',
              getStatusColor()
            )}
            onClick={onManualSync}
            disabled={status === 'syncing'}
          >
            {getStatusIcon()}
            <span className="hidden sm:inline text-xs">
              {status === 'syncing' ? 'Синхронизация...' : formatLastSync(lastSyncTime)}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{getTooltipContent()}</p>
          {status !== 'syncing' && (
            <p className="text-xs text-muted-foreground mt-1">
              Нажмите для ручной синхронизации
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
