import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/entities/task';
import { gsheetsReadStatusApi, ReadStatus } from '@/lib/api/gsheets';
import { getSession, isAuthenticated } from '@/lib/auth/session';

/**
 * Get user ID from session
 */
export function getUserId(): string | null {
  const session = getSession();
  return session?.user_id || null;
}

export function hasUserId(): boolean {
  return isAuthenticated();
}

// Keep these for backward compatibility but they now use session
export function setUserId(_name: string): void {
  // No-op: user ID is now managed by session
  console.warn('setUserId is deprecated, use session management instead');
}

/**
 * Hook to track read/unread status of announcements using Google Sheets
 */
export function useAnnouncementReadStatus(announcements: Task[]) {
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  // Fetch read statuses from Google Sheets
  const fetchReadStatuses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const statuses = await gsheetsReadStatusApi.list();
      setReadStatuses(statuses);
    } catch (error) {
      console.error('Error fetching read statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReadStatuses();
  }, [fetchReadStatuses]);

  // Set of read announcement IDs for quick lookup
  const readAnnouncementIds = useMemo(() => {
    return new Set(readStatuses.map(s => s.announcement_id));
  }, [readStatuses]);

  // Count unread announcements
  const unreadCount = useMemo(() => {
    if (!userId) {
      // If no user ID, count all as unread
      return announcements.length;
    }
    return announcements.filter((a) => !readAnnouncementIds.has(a.id)).length;
  }, [announcements, readAnnouncementIds, userId]);

  // Mark all announcements as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unreadIds = announcements
      .filter((a) => !readAnnouncementIds.has(a.id))
      .map((a) => a.id);

    if (unreadIds.length === 0) return;

    try {
      const newStatuses = await gsheetsReadStatusApi.markAsRead(unreadIds);
      setReadStatuses((prev) => [...prev, ...newStatuses]);
    } catch (error) {
      console.error('Error marking announcements as read:', error);
    }
  }, [userId, announcements, readAnnouncementIds]);

  // Check if a specific announcement is unread
  const isUnread = useCallback((announcement: Task) => {
    if (!userId) return true;
    return !readAnnouncementIds.has(announcement.id);
  }, [userId, readAnnouncementIds]);

  return {
    unreadCount,
    markAllAsRead,
    isUnread,
    hasUnread: unreadCount > 0,
    loading,
    needsUserName: !userId,
  };
}
