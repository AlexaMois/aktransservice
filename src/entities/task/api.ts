/**
 * Task API module - centralized task data operations
 */

import { Task, TaskStatus } from './model';
import { supabase } from '@/integrations/supabase/client';
import { gsheetsTasksApi, isGSheetsMode } from '@/lib/api/gsheets';
import { mapToTask } from '@/lib/typeGuards';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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
  if (!data) return [];

  return data.map(row => mapToTask(row as Record<string, unknown>));
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

  const insertData: TablesInsert<'tasks'> = {
    title: task.title,
    summary: task.summary,
    description: task.description,
    task_type: task.task_type,
    priority: task.priority,
    author: task.author,
    importance: task.importance,
    owner: task.owner,
    url: task.url,
    input_data_description: task.input_data_description,
    file_name: task.file_name,
    file_url: task.file_url,
    problem_description: task.problem_description,
    effect_type: task.effect_type,
    linked_idea_id: task.linked_idea_id,
    linked_problem_id: task.linked_problem_id,
    result_before: task.result_before,
    result_action: task.result_action,
    result_after: task.result_after,
    execution_log: task.execution_log,
    status: 'ideas',
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No data returned from insert');

  return mapToTask(data as Record<string, unknown>);
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

  // Build update object with only defined fields
  const updateData: TablesUpdate<'tasks'> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.summary !== undefined) updateData.summary = updates.summary;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.task_type !== undefined) updateData.task_type = updates.task_type;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.importance !== undefined) updateData.importance = updates.importance;
  if (updates.owner !== undefined) updateData.owner = updates.owner;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.input_data_description !== undefined) updateData.input_data_description = updates.input_data_description;
  if (updates.file_name !== undefined) updateData.file_name = updates.file_name;
  if (updates.file_url !== undefined) updateData.file_url = updates.file_url;
  if (updates.problem_description !== undefined) updateData.problem_description = updates.problem_description;
  if (updates.effect_type !== undefined) updateData.effect_type = updates.effect_type;
  if (updates.linked_idea_id !== undefined) updateData.linked_idea_id = updates.linked_idea_id;
  if (updates.linked_problem_id !== undefined) updateData.linked_problem_id = updates.linked_problem_id;
  if (updates.result_before !== undefined) updateData.result_before = updates.result_before;
  if (updates.result_action !== undefined) updateData.result_action = updates.result_action;
  if (updates.result_after !== undefined) updateData.result_after = updates.result_after;
  if (updates.execution_log !== undefined) updateData.execution_log = updates.execution_log;

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No data returned from update');

  return mapToTask(data as Record<string, unknown>);
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
