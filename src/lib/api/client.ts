/**
 * Unified API Client for Supabase Edge Functions
 * 
 * All business logic lives on the backend. Frontend only calls API endpoints.
 * This client auto-attaches user identity (stable anon_id or session user_id).
 */

import { getStableUserId } from '@/lib/appMode';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Unified API call helper
 * - Auto-attaches user_id to all requests
 * - Returns typed response data
 * - Throws ApiError on failure
 */
export async function api<T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const userId = getStableUserId();
  
  // Attach user_id to all requests
  const requestBody = {
    ...body,
    user_id: userId,
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      path,
      ...requestBody,
    }),
  });

  const text = await response.text();
  let result: ApiResponse<T>;

  try {
    result = text ? JSON.parse(text) : { ok: false };
  } catch {
    throw new ApiError(
      `Ошибка сервера (${response.status}). Попробуйте обновить страницу.`,
      response.status
    );
  }

  if (!response.ok || !result.ok) {
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get('retry-after') || '60');
      window.dispatchEvent(new CustomEvent('app:rate-limited', { 
        detail: { retryAfterMs: Math.max(5, retryAfterSec) * 1000 } 
      }));
      throw new ApiError(
        'Лимит обращений исчерпан. Попробуйте позже.',
        429,
        'RATE_LIMITED'
      );
    }

    throw new ApiError(
      result.error || `HTTP Error ${response.status}`,
      response.status
    );
  }

  return result.data as T;
}

// =============================================================================
// TASKS API
// =============================================================================

import { Task, TaskScope } from '@/entities/task';

export const tasksApi = {
  /**
   * List all tasks for a given scope
   */
  async list(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
    return api<Task[]>('/tasks/list', { 
      action: 'list',
      entity: 'tasks',
      data: { task_scope: taskScope } 
    });
  },

  /**
   * Create a new task
   */
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    return api<Task>('/tasks/create', {
      action: 'create',
      entity: 'tasks',
      data: task,
    });
  },

  /**
   * Update an existing task
   */
  async update(taskId: string, updates: Partial<Task>, taskScope: TaskScope = 'digitization'): Promise<Task> {
    return api<Task>('/tasks/update', {
      action: 'update',
      entity: 'tasks',
      id: taskId,
      data: { ...updates, task_scope: taskScope },
    });
  },

  /**
   * Delete a task
   */
  async delete(taskId: string, taskScope: TaskScope = 'digitization'): Promise<void> {
    await api<void>('/tasks/delete', {
      action: 'delete',
      entity: 'tasks',
      id: taskId,
      data: { task_scope: taskScope },
    });
  },
};

// =============================================================================
// ANNOUNCEMENTS API
// =============================================================================

export interface ReadStatus {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export const announcementsApi = {
  /**
   * Get read statuses for current user
   */
  async getReadStatus(): Promise<ReadStatus[]> {
    return api<ReadStatus[]>('/announcements/read-status', {
      action: 'list',
      entity: 'readStatus',
      data: {},
    });
  },

  /**
   * Mark announcements as read
   */
  async markAsRead(announcementIds: string[]): Promise<ReadStatus[]> {
    return api<ReadStatus[]>('/announcements/mark-read', {
      action: 'create',
      entity: 'readStatus',
      data: { announcement_ids: announcementIds },
    });
  },
};

// =============================================================================
// COMMENTS API
// =============================================================================

import { TaskComment } from '@/entities/task';

export const commentsApi = {
  /**
   * List comments for a task
   */
  async list(taskId: string): Promise<TaskComment[]> {
    return api<TaskComment[]>('/comments/list', {
      action: 'list',
      entity: 'comments',
      data: { task_id: taskId },
    });
  },

  /**
   * Add a comment to a task
   */
  async create(taskId: string, text: string): Promise<TaskComment> {
    return api<TaskComment>('/comments/create', {
      action: 'create',
      entity: 'comments',
      data: { task_id: taskId, text },
    });
  },
};
