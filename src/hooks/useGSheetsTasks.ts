import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, TaskComment } from '@/entities/task';
import { Announcement } from '@/types/task';
import { gsheetsAnnouncementsApi, gsheetsCommentsApi, isGSheetsMode } from '@/lib/api/gsheets';
import { supabase } from '@/integrations/supabase/client';
import { useSyncStatus } from './useSyncStatus';
import { mapToAnnouncement } from '@/lib/typeGuards';
import * as taskApi from '@/entities/task/api';

// Polling interval in milliseconds (30 seconds by default)
const DEFAULT_POLLING_INTERVAL = 30000;

// Use Google Sheets if configured, otherwise fall back to Supabase
export function useGSheetsTasks(pollingInterval = DEFAULT_POLLING_INTERVAL, enabled = true) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const gsheetsEnabled = isGSheetsMode();
  const isInitialLoad = useRef(true);
  
  const { 
    status: syncStatus, 
    lastSyncTime, 
    error: syncError, 
    sync, 
    setSyncCallback 
  } = useSyncStatus({ 
    pollingInterval, 
    enabled: (gsheetsEnabled as boolean) && enabled,
  });

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
      const data = await taskApi.fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error; // Re-throw for sync status tracking
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [enabled]);

  // Set up sync callback for polling
  useEffect(() => {
    setSyncCallback(() => fetchTasks(false));
  }, [fetchTasks, setSyncCallback]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    fetchTasks(true);
  }, [enabled, fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      const newTask = await taskApi.createTask(task);
      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await taskApi.updateTask(taskId, updates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await taskApi.deleteTask(taskId);
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

export function useGSheetsAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const gsheetsEnabled = isGSheetsMode();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      if (gsheetsEnabled) {
        const data = await gsheetsAnnouncementsApi.list();
        setAnnouncements(data);
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('published_at', { ascending: false });

        if (error) throw error;
        if (data) {
          const mapped = data.map(row => mapToAnnouncement(row as Record<string, unknown>));
          setAnnouncements(mapped);
        } else {
          setAnnouncements([]);
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [gsheetsEnabled]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return { announcements, loading, refetch: fetchAnnouncements };
}

export function useGSheetsComments(taskId: string) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const gsheetsEnabled = isGSheetsMode();

  const fetchComments = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (gsheetsEnabled) {
        const data = await gsheetsCommentsApi.list(taskId);
        setComments(data);
      } else {
        const { data, error } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data) {
          const mapped: TaskComment[] = data.map(item => ({
            id: item.id,
            task_id: item.task_id,
            author: item.author,
            text: item.text,
            created_at: item.created_at,
          }));
          setComments(mapped);
        } else {
          setComments([]);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, gsheetsEnabled]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (author: string, text: string): Promise<TaskComment> => {
    try {
      if (gsheetsEnabled) {
        // Note: author is now set by server from session
        const newComment = await gsheetsCommentsApi.create({
          task_id: taskId,
          text,
        });
        setComments((prev) => [...prev, newComment]);
        return newComment;
      } else {
        const { data, error } = await supabase
          .from('task_comments')
          .insert({
            task_id: taskId,
            author: author || 'Аноним',
            text,
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned from insert');

        const newComment: TaskComment = {
          id: data.id,
          task_id: data.task_id,
          author: data.author,
          text: data.text,
          created_at: data.created_at,
        };

        setComments((prev) => [...prev, newComment]);
        return newComment;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
