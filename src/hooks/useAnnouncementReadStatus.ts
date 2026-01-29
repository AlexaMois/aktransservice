import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/entities/task';
import { gsheetsReadStatusApi, ReadStatus } from '@/lib/api/gsheets';
import { getSession, isAuthenticated } from '@/lib/auth/session';

// Anonymous user ID for public mode (localStorage based)
const ANON_USER_KEY = 'app_anonymous_user_id';

function getOrCreateAnonUserId(): string {
  if (typeof window === 'undefined') return 'anon';
  let anonId = localStorage.getItem(ANON_USER_KEY);
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(ANON_USER_KEY, anonId);
  }
  return anonId;
}

/**
 * Get user ID from session or anonymous ID for public mode
 */
export function getUserId(): string {
  const session = getSession();
  return session?.user_id || getOrCreateAnonUserId();
}

export function hasUserId(): boolean {
  // Always return true in public mode
  return true;
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
  const userId = getUserId(); // Always returns a value now

  // Fetch read statuses from Google Sheets
  const fetchReadStatuses = useCallback(async () => {
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
    return announcements.filter((a) => !readAnnouncementIds.has(a.id)).length;
  }, [announcements, readAnnouncementIds]);

  // Mark all announcements as read
  const markAllAsRead = useCallback(async () => {
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
  }, [announcements, readAnnouncementIds]);

  // Check if a specific announcement is unread
  const isUnread = useCallback((announcement: Task) => {
    return !readAnnouncementIds.has(announcement.id);
  }, [readAnnouncementIds]);

  return {
    unreadCount,
    markAllAsRead,
    isUnread,
    hasUnread: unreadCount > 0,
    loading,
    needsUserName: false, // Always false in public mode
  };
}
