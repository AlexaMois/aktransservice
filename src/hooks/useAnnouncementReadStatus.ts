/**
 * Hook to track read/unread status of announcements
 * Uses unified API client - all logic lives on backend
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task } from '@/entities/task';
import { announcementsApi } from '@/lib/api/client';
import { getStableUserId } from '@/lib/appMode';

// Re-export for backward compatibility
export { getStableUserId as getUserId };

export function hasUserId(): boolean {
  return true; // Always true - we always have a stable user ID
}

// Keep these for backward compatibility but they now use session
export function setUserId(_name: string): void {
  // No-op: user ID is now managed by appMode
  console.warn('setUserId is deprecated, use appMode instead');
}

// LocalStorage key for persisting read status locally (backup + instant hydration)
const LOCAL_READ_KEY = 'app_announcement_read_ids';

function getLocalReadIds(): Set<string> {
  try {
    const stored = localStorage.getItem(LOCAL_READ_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveLocalReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LOCAL_READ_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

/**
 * Hook to track read/unread status of announcements
 * - Uses unified API client
 * - Local persistence for instant hydration
 * - Optimistic updates for immediate UI response
 */
export function useAnnouncementReadStatus(announcements: Task[]) {
  const [serverReadIds, setServerReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Initialize from localStorage for instant hydration
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => getLocalReadIds());
  const fetchedRef = useRef(false);

  // Fetch read statuses from backend
  const fetchReadStatuses = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    try {
      const statuses = await announcementsApi.getReadStatus();
      const ids = new Set(statuses.map(s => s.announcement_id));
      setServerReadIds(ids);
      
      // Merge server statuses with local ones
      setLocalReadIds(prev => {
        const merged = new Set([...prev, ...ids]);
        saveLocalReadIds(merged);
        return merged;
      });
    } catch (error) {
      console.error('Error fetching read statuses:', error);
      // On error, keep using local storage backup
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadStatuses();
  }, [fetchReadStatuses]);

  // Combined set of read IDs (server + local)
  const readAnnouncementIds = useMemo(() => {
    const ids = new Set([...serverReadIds, ...localReadIds]);
    return ids;
  }, [serverReadIds, localReadIds]);

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

    // Optimistic update + persist to localStorage immediately
    setLocalReadIds(prev => {
      const next = new Set(prev);
      unreadIds.forEach(id => next.add(id));
      saveLocalReadIds(next);
      return next;
    });

    try {
      const newStatuses = await announcementsApi.markAsRead(unreadIds);
      setServerReadIds(prev => {
        const next = new Set(prev);
        newStatuses.forEach(s => next.add(s.announcement_id));
        return next;
      });
    } catch (error) {
      console.error('Error marking announcements as read:', error);
      // Keep optimistic update even on error - localStorage ensures persistence
    }
  }, [announcements, readAnnouncementIds]);

  // Mark a single announcement as read
  const markAsRead = useCallback(
    async (announcementId: string) => {
      if (!announcementId || readAnnouncementIds.has(announcementId)) return;
      
      // Optimistic update immediately + persist to localStorage
      setLocalReadIds(prev => {
        const next = new Set(prev).add(announcementId);
        saveLocalReadIds(next);
        return next;
      });

      try {
        const newStatuses = await announcementsApi.markAsRead([announcementId]);
        setServerReadIds(prev => {
          const next = new Set(prev);
          newStatuses.forEach(s => next.add(s.announcement_id));
          return next;
        });
      } catch (error) {
        console.error('Error marking announcement as read:', error);
        // Keep optimistic update even on error - localStorage ensures persistence
      }
    },
    [readAnnouncementIds]
  );

  // Check if a specific announcement is unread
  const isUnread = useCallback((announcement: Task) => {
    return !readAnnouncementIds.has(announcement.id);
  }, [readAnnouncementIds]);

  return {
    unreadCount,
    markAllAsRead,
    markAsRead,
    isUnread,
    hasUnread: unreadCount > 0,
    loading,
    needsUserName: false, // Always false - we always have stable user ID
  };
}
