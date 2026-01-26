import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, Announcement, TaskComment } from '@/types/task';
import { gsheetsTasksApi, gsheetsAnnouncementsApi, gsheetsCommentsApi, isGSheetsMode } from '@/lib/api/gsheets';
import { supabase } from '@/integrations/supabase/client';
import { useSyncStatus, SyncStatus } from './useSyncStatus';

// Polling interval in milliseconds (30 seconds by default)
const DEFAULT_POLLING_INTERVAL = 30000;

// Use Google Sheets if configured, otherwise fall back to Supabase
export function useGSheetsTasks(pollingInterval = DEFAULT_POLLING_INTERVAL) {
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
    enabled: gsheetsEnabled as boolean 
  });

  const fetchTasks = useCallback(async (showLoading = true) => {
    if (showLoading && isInitialLoad.current) {
      setLoading(true);
    }
    try {
      if (gsheetsEnabled) {
        const data = await gsheetsTasksApi.list();
        setTasks(data);
      } else {
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const mappedTasks = (data || []).map(task => ({
          ...task,
          summary: task.summary || task.description || '',
        })) as Task[];
        setTasks(mappedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error; // Re-throw for sync status tracking
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [gsheetsEnabled]);

  // Set up sync callback for polling
  useEffect(() => {
    setSyncCallback(() => fetchTasks(false));
  }, [fetchTasks, setSyncCallback]);

  // Initial fetch
  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      if (gsheetsEnabled) {
        const newTask = await gsheetsTasksApi.create({
          ...task,
          status: 'ideas' as TaskStatus,
        });
        setTasks((prev) => [newTask, ...prev]);
        return newTask;
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...task,
            status: 'ideas',
          } as any)
          .select()
          .single();

        if (error) throw error;

        const newTask = {
          ...data,
          summary: data.summary || data.description || '',
        } as Task;
        
        setTasks((prev) => [newTask, ...prev]);
        return newTask;
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (gsheetsEnabled) {
        const updatedTask = await gsheetsTasksApi.update(taskId, updates);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        return updatedTask;
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates as any)
          .eq('id', taskId)
          .select()
          .single();

        if (error) throw error;

        const updatedTask = {
          ...data,
          summary: data.summary || data.description || '',
        } as Task;

        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        return updatedTask;
      }
    } catch (error) {
      console.error('Error updating task:', error);
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
        setAnnouncements(data as Announcement[]);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
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
    if (!taskId) return;
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
        setComments(data as TaskComment[]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId, gsheetsEnabled]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (author: string, text: string) => {
    try {
      if (gsheetsEnabled) {
        const newComment = await gsheetsCommentsApi.create({
          task_id: taskId,
          author,
          text,
        });
        setComments((prev) => [...prev, newComment]);
        return newComment;
      } else {
        const { data, error } = await supabase
          .from('task_comments')
          .insert({
            task_id: taskId,
            author,
            text,
          })
          .select()
          .single();

        if (error) throw error;

        setComments((prev) => [...prev, data as TaskComment]);
        return data as TaskComment;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
