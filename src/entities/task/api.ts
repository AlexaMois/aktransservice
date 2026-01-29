/**
 * Task API module - Uses unified API client
 * All task CRUD operations go through tasksApi → /gsheets-api → Google Sheets
 */

import { Task, TaskStatus, TaskScope } from './model';
import { tasksApi } from '@/lib/api/client';

/**
 * Fetch tasks from API based on scope
 */
export async function fetchTasks(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
  return tasksApi.list(taskScope);
}

/**
 * Create a new task with 'ideas' status
 */
export async function createTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<Task> {
  return tasksApi.create({
    ...task,
    status: 'ideas' as TaskStatus,
  });
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  taskScope: TaskScope = 'digitization'
): Promise<Task> {
  return tasksApi.update(taskId, updates, taskScope);
}

/**
 * Update task status only
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  taskScope: TaskScope = 'digitization'
): Promise<Task> {
  return updateTask(taskId, { status }, taskScope);
}

/**
 * Delete a task by ID
 */
export async function deleteTask(
  taskId: string, 
  taskScope: TaskScope = 'digitization'
): Promise<void> {
  return tasksApi.delete(taskId, taskScope);
}
