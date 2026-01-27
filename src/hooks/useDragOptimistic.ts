import { useState, useCallback, useRef, useMemo } from 'react';
import { Task, TaskStatus } from '@/types/task';

interface UseDragOptimisticOptions {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  debounceMs?: number;
}

interface PendingUpdate {
  taskId: string;
  newStatus: TaskStatus;
  originalStatus: TaskStatus;
  timeoutId: number;
  abortController: AbortController;
}

/**
 * Hook for optimistic drag & drop with debouncing
 * - Immediately updates local state for smooth UX
 * - Debounces API calls to prevent rapid-fire requests
 * - Handles rollback on failure
 * - Cancels stale requests when new updates come in
 */
export function useDragOptimistic({ tasks, onUpdateTask, debounceMs = 400 }: UseDragOptimisticOptions) {
  // Track which tasks have been optimistically updated (for visual feedback)
  const [syncingTasks, setSyncingTasks] = useState<Set<string>>(new Set());
  
  // Track optimistic local overrides of task statuses
  const [optimisticStatuses, setOptimisticStatuses] = useState<Map<string, TaskStatus>>(new Map());
  
  // Store pending updates for debouncing and cancellation
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  
  /**
   * Cancel any pending update for a task
   */
  const cancelPendingUpdate = useCallback((taskId: string) => {
    const pending = pendingUpdates.current.get(taskId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pending.abortController.abort();
      pendingUpdates.current.delete(taskId);
    }
  }, []);

  /**
   * Update task status optimistically with debounced API call
   */
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus): Promise<boolean> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    // Use current optimistic status or actual status
    const currentStatus = optimisticStatuses.get(taskId) || task.status;
    if (currentStatus === newStatus) return true;
    
    // Cancel any existing pending update for this task
    cancelPendingUpdate(taskId);
    
    // Immediately apply optimistic update
    setOptimisticStatuses(prev => new Map(prev).set(taskId, newStatus));
    setSyncingTasks(prev => new Set(prev).add(taskId));
    
    // Create abort controller for this request
    const abortController = new AbortController();
    
    return new Promise((resolve) => {
      // Debounce the actual API call
      const timeoutId = window.setTimeout(async () => {
        try {
          await onUpdateTask(taskId, { status: newStatus });
          
          // Success - remove from syncing and clear optimistic override
          // (the real data will come from refetch/polling)
          pendingUpdates.current.delete(taskId);
          setSyncingTasks(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          setOptimisticStatuses(prev => {
            const next = new Map(prev);
            next.delete(taskId);
            return next;
          });
          
          resolve(true);
        } catch (error) {
          // Check if it was aborted (new update came in)
          if (abortController.signal.aborted) {
            resolve(false);
            return;
          }
          
          console.error('Failed to update task status:', error);
          
          // Rollback optimistic update
          setOptimisticStatuses(prev => {
            const next = new Map(prev);
            next.delete(taskId);
            return next;
          });
          setSyncingTasks(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          pendingUpdates.current.delete(taskId);
          
          resolve(false);
        }
      }, debounceMs);
      
      // Store pending update info
      pendingUpdates.current.set(taskId, {
        taskId,
        newStatus,
        originalStatus: task.status,
        timeoutId,
        abortController,
      });
    });
  }, [tasks, optimisticStatuses, cancelPendingUpdate, onUpdateTask, debounceMs]);

  /**
   * Get task with optimistic status applied
   */
  const getOptimisticTask = useCallback((task: Task): Task => {
    const optimisticStatus = optimisticStatuses.get(task.id);
    if (optimisticStatus && optimisticStatus !== task.status) {
      return { ...task, status: optimisticStatus };
    }
    return task;
  }, [optimisticStatuses]);

  /**
   * Apply optimistic updates to task list
   */
  const tasksWithOptimistic = useMemo(() => {
    return tasks.map(getOptimisticTask);
  }, [tasks, getOptimisticTask]);

  /**
   * Check if a task is currently syncing
   */
  const isTaskSyncing = useCallback((taskId: string): boolean => {
    return syncingTasks.has(taskId);
  }, [syncingTasks]);

  /**
   * Clear all pending updates (e.g., on unmount)
   */
  const clearAllPending = useCallback(() => {
    pendingUpdates.current.forEach((_, taskId) => {
      cancelPendingUpdate(taskId);
    });
    setSyncingTasks(new Set());
    setOptimisticStatuses(new Map());
  }, [cancelPendingUpdate]);

  return {
    updateTaskStatus,
    tasksWithOptimistic,
    isTaskSyncing,
    clearAllPending,
    hasPendingUpdates: syncingTasks.size > 0,
  };
}
