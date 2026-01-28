/**
 * Task hooks - Google Sheets is the ONLY source of truth
 * 
 * IMPORTANT: useTasks is DEPRECATED for tasks - use useGSheetsTasks instead
 * This file only re-exports GSheets hooks and provides non-task Supabase hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskComment } from '@/entities/task';
import { Announcement, DigitizationQueueItem, NotAutomatingItem, ExperimentItem } from '@/types/task';
import { mapToAnnouncement, mapToDigitizationQueueItem, mapToNotAutomatingItem, mapToExperimentItem } from '@/lib/typeGuards';

// Re-export GSheets hooks - these are the ONLY way to work with tasks
export { useGSheetsTasks, useGSheetsAnnouncements, useGSheetsComments } from './useGSheetsTasks';

// NOTE: useTasks() for tasks has been REMOVED
// All task operations MUST go through useGSheetsTasks()

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
      setAnnouncements([]);
    } else if (data) {
      const mapped = data.map(row => mapToAnnouncement(row as Record<string, unknown>));
      setAnnouncements(mapped);
    } else {
      setAnnouncements([]);
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
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToDigitizationQueueItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
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
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToNotAutomatingItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
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
        setItems([]);
      } else if (data) {
        const mapped = data.map(row => mapToExperimentItem(row as Record<string, unknown>));
        setItems(mapped);
      } else {
        setItems([]);
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
