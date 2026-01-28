/**
 * Task API module - Google Sheets is the ONLY source of truth
 * All task CRUD operations go through gsheetsTasksApi → /gsheets-api → Google Sheets
 */

import { Task, TaskStatus } from './model';
import { gsheetsTasksApi } from '@/lib/api/gsheets';

/**
 * Fetch all tasks from Google Sheets, sorted by created_at descending
 */
export async function fetchTasks(): Promise<Task[]> {
  return gsheetsTasksApi.list();
}

/**
 * Create a new task with 'ideas' status in Google Sheets
 */
export async function createTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<Task> {
  return gsheetsTasksApi.create({
    ...task,
    status: 'ideas' as TaskStatus,
  });
}

/**
 * Update an existing task in Google Sheets
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  return gsheetsTasksApi.update(taskId, updates);
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
 * Delete a task by ID from Google Sheets
 */
export async function deleteTask(taskId: string): Promise<void> {
  return gsheetsTasksApi.delete(taskId);
}
