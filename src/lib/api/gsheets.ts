import { Task, TaskComment, TaskScope } from '@/entities/task';
import { Announcement } from '@/types/task';
import { getSession } from '@/lib/auth/session';
import { edgeFetch, base64UrlEncodeUtf8 } from '@/shared/api/edgeFetch';

function notifyRateLimited(retryAfterMs: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:rate-limited', { detail: { retryAfterMs } }));
}

interface GSheetsAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callGSheetsAPI<T = unknown>(
  action: string, 
  entity: string, 
  data?: Record<string, unknown> | null, 
  id?: string
): Promise<T> {
  const session = getSession();
  
  const headers: Record<string, string> = {};
  
  // Add session header for authenticated requests
  if (session) {
    // IMPORTANT: Header values must be ISO-8859-1. Names can contain Cyrillic,
    // so we send base64url(JSON) and decode it on the backend.
    headers['X-App-Session'] = base64UrlEncodeUtf8(JSON.stringify(session));
  }
  
  const response = await edgeFetch('/gsheets-api', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, entity, data, id }),
  });

  // Be defensive: edge/runtime can sometimes return non-JSON bodies on failures.
  const raw = await response.text();
  let result: GSheetsAPIResponse<T>;
  try {
    result = raw ? JSON.parse(raw) : { success: false };
  } catch {
    // If server didn't return JSON, still surface a useful error
    // NOTE: Do NOT clear session on 401 - user stays logged in until manual logout
    if (response.status === 401) {
      throw new Error('Ошибка авторизации. Попробуйте обновить страницу.');
    }
    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get('retry-after') || '60');
      notifyRateLimited(Math.max(5, retryAfterSec) * 1000);
      throw new Error('Лимит обращений к Google Sheets исчерпан. Попробуйте позже.');
    }
    throw new Error(`Ошибка сервера (${response.status}). Попробуйте обновить страницу.`);
  }
  
  if (!result.success) {
    // Handle specific error codes
    // NOTE: Do NOT clear session on 401 - user stays logged in until manual logout
    if (response.status === 401) {
      throw new Error('Ошибка авторизации. Попробуйте обновить страницу.');
    }
    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get('retry-after') || '60');
      notifyRateLimited(Math.max(5, retryAfterSec) * 1000);
      throw new Error(result.error || 'Лимит обращений к Google Sheets исчерпан. Попробуйте позже.');
    }
    if (response.status === 403) {
      throw new Error(result.error || 'Доступ запрещён');
    }
    throw new Error(result.error || 'API call failed');
  }
  
  return result.data as T;
}

// Tasks API - supports both digitization (Tasks sheet) and personal sheets
export const gsheetsTasksApi = {
  async list(taskScope: TaskScope = 'digitization'): Promise<Task[]> {
    const data = await callGSheetsAPI<Task[]>('list', 'tasks', { task_scope: taskScope });
    return data.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    // Note: author will be set by server from session
    // task_scope determines which sheet to write to
    return callGSheetsAPI<Task>('create', 'tasks', task as unknown as Record<string, unknown>);
  },
  
  async update(id: string, updates: Partial<Task>, taskScope: TaskScope = 'digitization'): Promise<Task> {
    // Note: author cannot be changed by client
    // task_scope determines which sheet to update
    return callGSheetsAPI<Task>('update', 'tasks', { 
      ...updates, 
      task_scope: taskScope 
    } as unknown as Record<string, unknown>, id);
  },
  
  async delete(id: string, taskScope: TaskScope = 'digitization'): Promise<void> {
    await callGSheetsAPI<void>('delete', 'tasks', { task_scope: taskScope }, id);
  },
};

// Announcements API
export const gsheetsAnnouncementsApi = {
  async list(): Promise<Announcement[]> {
    const data = await callGSheetsAPI<Announcement[]>('list', 'announcements');
    return data.sort((a, b) => 
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  },
  
  async create(announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> {
    return callGSheetsAPI<Announcement>('create', 'announcements', announcement as unknown as Record<string, unknown>);
  },
  
  async update(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    return callGSheetsAPI<Announcement>('update', 'announcements', updates as unknown as Record<string, unknown>, id);
  },
  
  async delete(id: string): Promise<void> {
    await callGSheetsAPI<void>('delete', 'announcements', null, id);
  },
};

// Comments API
export const gsheetsCommentsApi = {
  async list(taskId?: string): Promise<TaskComment[]> {
    const data = await callGSheetsAPI<TaskComment[]>('list', 'comments', { task_id: taskId });
    return data.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },
  
  async create(comment: { task_id: string; text: string }): Promise<TaskComment> {
    // Note: author will be set by server from session
    return callGSheetsAPI<TaskComment>('create', 'comments', comment);
  },
};

// Read Status API (for tracking which announcements user has read)
export interface ReadStatus {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export const gsheetsReadStatusApi = {
  async list(userId?: string): Promise<ReadStatus[]> {
    // In public mode we pass a stable anon_id (localStorage) so read status works without auth.
    // Server may still fall back to session user_id when available.
    return callGSheetsAPI<ReadStatus[]>('list', 'readStatus', { user_id: userId });
  },
  
  async markAsRead(announcementIds: string[], userId?: string): Promise<ReadStatus[]> {
    // In public mode we pass a stable anon_id (localStorage) so read status works without auth.
    // Server may still fall back to session user_id when available.
    return callGSheetsAPI<ReadStatus[]>('create', 'readStatus', { announcement_ids: announcementIds, user_id: userId });
  },
};

// Initialize Google Sheets with migration
export async function initGoogleSheets(existingTasks: Task[], existingAnnouncements: Announcement[]): Promise<string> {
  const response = await edgeFetch('/gsheets-init', {
    method: 'POST',
    body: JSON.stringify({ existingTasks, existingAnnouncements }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to initialize Google Sheets');
  }
  
  return result.spreadsheetUrl;
}
