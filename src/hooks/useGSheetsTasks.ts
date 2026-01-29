/**
 * Google Sheets Tasks Hook - Uses Unified API Client
 * 
 * All task data flows through the unified API client:
 * useGSheetsTasks → tasksApi → /gsheets-api → Google Sheets
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, TaskComment, TaskScope } from '@/entities/task';
import { tasksApi, commentsApi } from '@/lib/api/client';
import { useSyncStatus } from './useSyncStatus';

// Polling interval in milliseconds (30 seconds by default)
const DEFAULT_POLLING_INTERVAL = 30000;

/**
 * Main hook for task management - ALL tasks come from backend API
 */
export function useGSheetsTasks(
  taskScope: TaskScope = 'digitization',
  pollingInterval = DEFAULT_POLLING_INTERVAL, 
  enabled = true
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  
  const { 
    status: syncStatus, 
    lastSyncTime, 
    error: syncError, 
    sync, 
    setSyncCallback 
  } = useSyncStatus({ 
    pollingInterval, 
    enabled: enabled,
  });

  // Fetch tasks from API
  const fetchTasks = useCallback(async (showLoading = true) => {
    if (!enabled) {
      setTasks([]);
      setLoading(false);
      isInitialLoad.current = false;
      return;
    }
    if (showLoading && isInitialLoad.current) {
      setLoading(true);
    }
    try {
      const data = await tasksApi.list(taskScope);
      // Sort by created_at descending
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTasks(sorted);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error; // Re-throw for sync status tracking
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [enabled, taskScope]);

  // Set up sync callback for polling
  useEffect(() => {
    setSyncCallback(() => fetchTasks(false));
  }, [fetchTasks, setSyncCallback]);

  // Refetch when taskScope changes
  useEffect(() => {
    if (!enabled) return;
    isInitialLoad.current = true;
    setLoading(true);
    fetchTasks(true);
  }, [enabled, taskScope, fetchTasks]);

  // Add task via API and refetch
  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      const newTask = await tasksApi.create({
        ...task,
        status: 'ideas' as TaskStatus,
      });
      // Refetch from API to ensure state is in sync
      await fetchTasks(false);
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  // Update task via API
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await tasksApi.update(taskId, updates, taskScope);
      // Update local state immediately for responsiveness
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  // Delete task via API
  const deleteTask = async (taskId: string) => {
    try {
      await tasksApi.delete(taskId, taskScope);
      // Remove from local state only after successful API call
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    getTasksByStatus,
    refetch: fetchTasks,
    // Sync status
    syncStatus,
    lastSyncTime,
    syncError,
    manualSync: sync,
  };
}

/**
 * Hook for task comments - Uses unified API
 */
export function useGSheetsComments(taskId: string) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await commentsApi.list(taskId);
      // Sort by created_at ascending
      const sorted = data.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setComments(sorted);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (author: string, text: string): Promise<TaskComment> => {
    try {
      const newComment = await commentsApi.create(taskId, text);
      setComments((prev) => [...prev, newComment]);
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
