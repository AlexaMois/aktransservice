import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/types/task';

const STORAGE_KEY = 'announcements_last_read_timestamp';

/**
 * Hook to track read/unread status of announcements using localStorage
 * Tracks the last time the user viewed the announcements tab
 */
export function useAnnouncementReadStatus(announcements: Task[]) {
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Count unread announcements (created after last read timestamp)
  const unreadCount = useMemo(() => {
    if (!lastReadTimestamp) {
      // If user never viewed announcements, all are unread
      return announcements.length;
    }

    const lastReadDate = new Date(lastReadTimestamp);
    return announcements.filter((announcement) => {
      const createdDate = new Date(announcement.created_at);
      return createdDate > lastReadDate;
    }).length;
  }, [announcements, lastReadTimestamp]);

  // Mark all announcements as read (called when user opens the tab)
  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setLastReadTimestamp(now);
  }, []);

  // Check if a specific announcement is unread
  const isUnread = useCallback((announcement: Task) => {
    if (!lastReadTimestamp) return true;
    const lastReadDate = new Date(lastReadTimestamp);
    const createdDate = new Date(announcement.created_at);
    return createdDate > lastReadDate;
  }, [lastReadTimestamp]);

  return {
    unreadCount,
    markAllAsRead,
    isUnread,
    hasUnread: unreadCount > 0,
  };
}
