import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, Announcement, DigitizationQueueItem, NotAutomatingItem, ExperimentItem, TaskComment } from '@/types/task';

// Re-export GSheets hooks for use in components
export { useGSheetsTasks, useGSheetsAnnouncements, useGSheetsComments } from './useGSheetsTasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      // Map data to ensure summary exists (fallback to description for backwards compatibility)
      const mappedTasks = (data || []).map(task => ({
        ...task,
        summary: task.summary || task.description || '',
      })) as Task[];
      setTasks(mappedTasks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        status: 'ideas' as TaskStatus,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      throw error;
    }

    const newTask = {
      ...data,
      summary: data.summary || data.description || '',
    } as Task;
    
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    const updatedTask = {
      ...data,
      summary: data.summary || data.description || '',
    } as Task;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    return updatedTask;
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    getTasksByStatus,
    refetch: fetchTasks,
  };
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return { announcements, loading, refetch: fetchAnnouncements };
}

export function useDigitizationQueue() {
  const [items, setItems] = useState<DigitizationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('digitization_queue')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching digitization queue:', error);
      } else {
        setItems(data as DigitizationQueueItem[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}

export function useNotAutomating() {
  const [items, setItems] = useState<NotAutomatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('not_automating')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching not automating:', error);
      } else {
        setItems(data as NotAutomatingItem[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}

export function useExperiments() {
  const [items, setItems] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching experiments:', error);
      } else {
        setItems(data as ExperimentItem[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { items, loading };
}

export function useTaskComments(taskId: string) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data as TaskComment[]);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (author: string, text: string) => {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author,
        text,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    setComments((prev) => [...prev, data as TaskComment]);
    return data as TaskComment;
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
