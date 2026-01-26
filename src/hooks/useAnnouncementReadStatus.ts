import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/types/task';
import { gsheetsReadStatusApi, ReadStatus, isGSheetsMode } from '@/lib/api/gsheets';

const USER_ID_KEY = 'user_display_name';

/**
 * Get or prompt for user ID (display name)
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(name: string): void {
  localStorage.setItem(USER_ID_KEY, name.trim());
}

export function hasUserId(): boolean {
  return !!getUserId();
}

/**
 * Hook to track read/unread status of announcements using Google Sheets
 * Falls back to localStorage timestamp if Google Sheets not available
 */
export function useAnnouncementReadStatus(announcements: Task[]) {
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();
  const gsheetsEnabled = isGSheetsMode();

  // Fetch read statuses from Google Sheets
  const fetchReadStatuses = useCallback(async () => {
    if (!userId || !gsheetsEnabled) {
      setLoading(false);
      return;
    }

    try {
      const statuses = await gsheetsReadStatusApi.list(userId);
      setReadStatuses(statuses);
    } catch (error) {
      console.error('Error fetching read statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, gsheetsEnabled]);

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
    if (!userId || !gsheetsEnabled) return;

    const unreadIds = announcements
      .filter((a) => !readAnnouncementIds.has(a.id))
      .map((a) => a.id);

    if (unreadIds.length === 0) return;

    try {
      const newStatuses = await gsheetsReadStatusApi.markAsRead(userId, unreadIds);
      setReadStatuses((prev) => [...prev, ...newStatuses]);
    } catch (error) {
      console.error('Error marking announcements as read:', error);
    }
  }, [userId, gsheetsEnabled, announcements, readAnnouncementIds]);

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
