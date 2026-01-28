/**
 * Task API module - Google Sheets is the ONLY source of truth
 * All task CRUD operations go through gsheetsTasksApi → /gsheets-api → Google Sheets
 * 
 * Architecture:
 * - 'digitization' scope → Tasks sheet (shared tasks)
 * - 'personal' scope → Tasks_UserName sheet (individual user sheets)
 */

import { Task, TaskStatus, TaskScope } from './model';
import { gsheetsTasksApi } from '@/lib/api/gsheets';

/**
 * Fetch tasks from Google Sheets based on scope
 * - digitization: fetches from main Tasks sheet
 * - personal: fetches from user's personal Tasks_Name sheet
 */
export async function fetchTasks(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
  return gsheetsTasksApi.list(taskScope);
}

/**
 * Create a new task with 'ideas' status in Google Sheets
 * Sheet is determined by task_scope in the task object
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
 * @param taskScope - determines which sheet to update
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  taskScope: TaskScope = 'digitization'
): Promise<Task> {
  return gsheetsTasksApi.update(taskId, updates, taskScope);
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
 * Delete a task by ID from Google Sheets
 * @param taskScope - determines which sheet to delete from
 */
export async function deleteTask(
  taskId: string, 
  taskScope: TaskScope = 'digitization'
): Promise<void> {
  return gsheetsTasksApi.delete(taskId, taskScope);
}
