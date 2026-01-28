/**
 * Task API module - centralized task data operations
 */

import { Task, TaskStatus } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { gsheetsTasksApi, isGSheetsMode } from '@/lib/api/gsheets';

/**
 * Fetch all tasks sorted by created_at descending
 */
export async function fetchTasks(): Promise<Task[]> {
  if (isGSheetsMode()) {
    return gsheetsTasksApi.list();
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(task => ({
    ...task,
    summary: task.summary || task.description || '',
  })) as Task[];
}

/**
 * Create a new task with 'ideas' status
 */
export async function createTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<Task> {
  if (isGSheetsMode()) {
    return gsheetsTasksApi.create({
      ...task,
      status: 'ideas' as TaskStatus,
    });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...task,
      status: 'ideas',
    } as any)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    summary: data.summary || data.description || '',
  } as Task;
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  if (isGSheetsMode()) {
    return gsheetsTasksApi.update(taskId, updates);
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates as any)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    summary: data.summary || data.description || '',
  } as Task;
}

/**
 * Update task status only
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  return updateTask(taskId, { status });
}

/**
 * Delete a task by ID
 */
export async function deleteTask(taskId: string): Promise<void> {
  if (isGSheetsMode()) {
    await gsheetsTasksApi.delete(taskId);
    return;
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}
