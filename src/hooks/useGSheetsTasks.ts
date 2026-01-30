/**
 * Google Sheets Tasks Hook - SINGLE SOURCE OF TRUTH
 * 
 * All task data flows through this hook:
 * useGSheetsTasks → taskApi → gsheetsTasksApi → /gsheets-api → Google Sheets
 * 
 * Architecture:
 * - 'digitization' scope → reads from Tasks sheet (shared)
 * - 'personal' scope → reads from user's personal Tasks_Name sheet
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, TaskComment, TaskScope } from '@/entities/task';
import { Announcement } from '@/types/task';
import { gsheetsAnnouncementsApi, gsheetsCommentsApi } from '@/lib/api/gsheets';
import { useSyncStatus } from './useSyncStatus';
import * as taskApi from '@/entities/task/api';

// Polling interval in milliseconds (30 seconds by default)
const DEFAULT_POLLING_INTERVAL = 30000;

/**
 * Main hook for task management - ALL tasks come from Google Sheets
 * TEMPORARY: taskScope is ignored - all tasks come from main Tasks sheet
 * @param taskScope - currently ignored (all tasks from main sheet)
 * @param pollingInterval - how often to refresh data (ms)
 * @param enabled - whether to fetch data
 */
export function useGSheetsTasks(
  _taskScope: TaskScope = 'digitization', // Ignored for now
  pollingInterval = DEFAULT_POLLING_INTERVAL, 
  enabled = true
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  
  // TEMPORARY: Always use 'digitization' to get all tasks from main sheet
  const taskScope: TaskScope = 'digitization';
  
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

  // Fetch tasks from appropriate Google Sheet based on scope
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
      // Fetch from appropriate sheet based on taskScope
      const data = await taskApi.fetchTasks(taskScope);
      // Replace state entirely with Google Sheets data - NO merging
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks from Google Sheets:', error);
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

  // Add task and ALWAYS refetch to ensure consistency with Google Sheets
  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      // Create task in Google Sheets
      const newTask = await taskApi.createTask(task);
      console.log('[useGSheetsTasks] Task created, refetching from Google Sheets...');
      // CRITICAL: Always refetch from Google Sheets to ensure state matches the source of truth
      await fetchTasks(false);
      console.log('[useGSheetsTasks] Refetch complete');
      return newTask;
    } catch (error) {
      console.error('[useGSheetsTasks] Error adding task:', error);
      throw error;
    }
  };

  // Update task in Google Sheets
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Always use 'digitization' since all tasks are in main sheet now
      const updatedTask = await taskApi.updateTask(taskId, updates, 'digitization');
      // Update local state immediately for responsiveness
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      return updatedTask;
    } catch (error) {
      console.error('[useGSheetsTasks] Error updating task:', error);
      throw error;
    }
  };

  // Delete task from Google Sheets
  const deleteTask = async (taskId: string) => {
    try {
      // Always use 'digitization' since all tasks are in main sheet now
      await taskApi.deleteTask(taskId, 'digitization');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('[useGSheetsTasks] Error deleting task:', error);
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
 * Hook for announcements - Google Sheets only
 */
export function useGSheetsAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gsheetsAnnouncementsApi.list();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return { announcements, loading, refetch: fetchAnnouncements };
}

/**
 * Hook for task comments - Google Sheets only
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
      const data = await gsheetsCommentsApi.list(taskId);
      setComments(data);
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
      // Note: author is now set by server from session
      const newComment = await gsheetsCommentsApi.create({
        task_id: taskId,
        text,
      });
      setComments((prev) => [...prev, newComment]);
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
