/**
 * DEPRECATED: Google Sheets API module
 * 
 * This file is kept for backward compatibility.
 * All new code should import from '@/lib/api/client' instead.
 * 
 * This re-exports from the unified API client.
 */

// Re-export everything from unified client for backward compatibility
export { tasksApi as gsheetsTasksApi, announcementsApi, commentsApi as gsheetsCommentsApi } from './client';
export type { ReadStatus } from './client';

// Legacy re-exports for old code that still uses these
import { tasksApi, announcementsApi, commentsApi } from './client';

// Backward compatible wrappers (deprecated)
export const gsheetsReadStatusApi = {
  async list(userId?: string) {
    // userId is now auto-attached by the unified client
    return announcementsApi.getReadStatus();
  },
  async markAsRead(announcementIds: string[], userId?: string) {
    // userId is now auto-attached by the unified client
    return announcementsApi.markAsRead(announcementIds);
  },
};

// Legacy announcements API wrapper
export const gsheetsAnnouncementsApi = {
  async list() {
    // Announcements are now part of tasks with type='announcement'
    // This is just a placeholder - actual announcements come from tasks list
    console.warn('gsheetsAnnouncementsApi.list() is deprecated, use tasksApi.list() instead');
    return [];
  },
  async create(announcement: Record<string, unknown>) {
    console.warn('gsheetsAnnouncementsApi.create() is deprecated');
    return announcement;
  },
  async update(id: string, updates: Record<string, unknown>) {
    console.warn('gsheetsAnnouncementsApi.update() is deprecated');
    return { id, ...updates };
  },
  async delete(id: string) {
    console.warn('gsheetsAnnouncementsApi.delete() is deprecated');
  },
};

// Legacy init function (no longer needed)
export async function initGoogleSheets(): Promise<string> {
  console.warn('initGoogleSheets() is deprecated');
  return '';
}
