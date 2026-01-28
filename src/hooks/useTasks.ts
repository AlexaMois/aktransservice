import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskComment } from '@/entities/task';
import { Announcement, DigitizationQueueItem, NotAutomatingItem, ExperimentItem } from '@/types/task';
import { normalizeTaskFields } from '@/lib/textNormalize';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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
    // Normalize text fields before saving
    const normalizedTask = normalizeTaskFields(task);
    
    const insertData: TablesInsert<'tasks'> = {
      title: normalizedTask.title,
      summary: normalizedTask.summary,
      description: normalizedTask.description,
      task_type: normalizedTask.task_type,
      priority: normalizedTask.priority,
      author: normalizedTask.author,
      importance: normalizedTask.importance,
      owner: normalizedTask.owner,
      url: normalizedTask.url,
      input_data_description: normalizedTask.input_data_description,
      file_name: normalizedTask.file_name,
      file_url: normalizedTask.file_url,
      problem_description: normalizedTask.problem_description,
      effect_type: normalizedTask.effect_type,
      linked_idea_id: normalizedTask.linked_idea_id,
      linked_problem_id: normalizedTask.linked_problem_id,
      result_before: normalizedTask.result_before,
      result_action: normalizedTask.result_action,
      result_after: normalizedTask.result_after,
      execution_log: normalizedTask.execution_log,
      status: 'ideas',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
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
    // Normalize text fields before saving
    const normalizedUpdates = normalizeTaskFields(updates);
    
    // Build update object with only defined fields
    const updateData: TablesUpdate<'tasks'> = {};
    if (normalizedUpdates.title !== undefined) updateData.title = normalizedUpdates.title;
    if (normalizedUpdates.summary !== undefined) updateData.summary = normalizedUpdates.summary;
    if (normalizedUpdates.description !== undefined) updateData.description = normalizedUpdates.description;
    if (normalizedUpdates.task_type !== undefined) updateData.task_type = normalizedUpdates.task_type;
    if (normalizedUpdates.status !== undefined) updateData.status = normalizedUpdates.status;
    if (normalizedUpdates.priority !== undefined) updateData.priority = normalizedUpdates.priority;
    if (normalizedUpdates.importance !== undefined) updateData.importance = normalizedUpdates.importance;
    if (normalizedUpdates.owner !== undefined) updateData.owner = normalizedUpdates.owner;
    if (normalizedUpdates.url !== undefined) updateData.url = normalizedUpdates.url;
    if (normalizedUpdates.input_data_description !== undefined) updateData.input_data_description = normalizedUpdates.input_data_description;
    if (normalizedUpdates.file_name !== undefined) updateData.file_name = normalizedUpdates.file_name;
    if (normalizedUpdates.file_url !== undefined) updateData.file_url = normalizedUpdates.file_url;
    if (normalizedUpdates.problem_description !== undefined) updateData.problem_description = normalizedUpdates.problem_description;
    if (normalizedUpdates.effect_type !== undefined) updateData.effect_type = normalizedUpdates.effect_type;
    if (normalizedUpdates.linked_idea_id !== undefined) updateData.linked_idea_id = normalizedUpdates.linked_idea_id;
    if (normalizedUpdates.linked_problem_id !== undefined) updateData.linked_problem_id = normalizedUpdates.linked_problem_id;
    if (normalizedUpdates.result_before !== undefined) updateData.result_before = normalizedUpdates.result_before;
    if (normalizedUpdates.result_action !== undefined) updateData.result_action = normalizedUpdates.result_action;
    if (normalizedUpdates.result_after !== undefined) updateData.result_after = normalizedUpdates.result_after;
    if (normalizedUpdates.execution_log !== undefined) updateData.execution_log = normalizedUpdates.execution_log;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
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
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } else if (data) {
      const mappedComments: TaskComment[] = data.map(item => ({
        id: item.id,
        task_id: item.task_id,
        author: item.author,
        text: item.text,
        created_at: item.created_at,
      }));
      setComments(mappedComments);
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (author: string, text: string): Promise<TaskComment> => {
    const normalizedText = text?.trim() || '';
    const normalizedAuthor = author?.trim() || 'Аноним';
    
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author: normalizedAuthor,
        text: normalizedText,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    const newComment: TaskComment = {
      id: data.id,
      task_id: data.task_id,
      author: data.author,
      text: data.text,
      created_at: data.created_at,
    };

    setComments((prev) => [...prev, newComment]);
    return newComment;
  };

  return { comments, loading, addComment, refetch: fetchComments };
}
