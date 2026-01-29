import { useState, useEffect, useCallback, useRef } from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UseSyncStatusOptions {
  pollingInterval?: number; // in milliseconds
  enabled?: boolean;
}

export function useSyncStatus(options: UseSyncStatusOptions = {}) {
  const { pollingInterval = 30000, enabled = true } = options;
  
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const syncCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  
  const setSyncCallback = useCallback((callback: () => Promise<void>) => {
    syncCallbackRef.current = callback;
  }, []);
  
  const isSyncingRef = useRef(false);
  
  const sync = useCallback(async () => {
    if (Date.now() < cooldownUntilRef.current) return;
    if (!syncCallbackRef.current || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setStatus('syncing');
    setError(null);
    
    try {
      await syncCallbackRef.current();
      setStatus('success');
      setLastSyncTime(new Date());
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);

      // Fallback: if quota exceeded, pause polling for a minute to avoid hammering the API.
      if (message.toLowerCase().includes('quota') || message.includes('429')) {
        const retryAfterMs = 60_000;
        cooldownUntilRef.current = Date.now() + retryAfterMs;
        stopPolling();
        setTimeout(() => {
          if (enabled) startPolling();
        }, retryAfterMs);
      }
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);
  
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (enabled && pollingInterval > 0) {
      intervalRef.current = setInterval(() => {
        sync();
      }, pollingInterval);
    }
  }, [enabled, pollingInterval, sync]);
  
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);
  
  // Handle visibility change - pause when hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Sync immediately when tab becomes visible again
        sync();
        startPolling();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sync, startPolling, stopPolling]);

  // Global rate-limit signal (from API layer): pause polling for retryAfterMs
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ retryAfterMs?: number }>;
      const retryAfterMs = Math.max(5_000, ce.detail?.retryAfterMs ?? 60_000);
      cooldownUntilRef.current = Date.now() + retryAfterMs;
      stopPolling();
      setTimeout(() => {
        if (enabled) startPolling();
      }, retryAfterMs);
    };
    window.addEventListener('app:rate-limited', handler);
    return () => window.removeEventListener('app:rate-limited', handler);
  }, [enabled, startPolling, stopPolling]);
  
  return {
    status,
    lastSyncTime,
    error,
    sync,
    setSyncCallback,
    startPolling,
    stopPolling,
  };
}
