import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task } from '@/entities/task';
import { gsheetsReadStatusApi, ReadStatus } from '@/lib/api/gsheets';
import { getStableUserId } from '@/lib/appMode';

// Re-export for backward compatibility
export { getStableUserId as getUserId };

export function hasUserId(): boolean {
  return true; // Always true - we always have a stable user ID
}

// Keep these for backward compatibility but they now use session
export function setUserId(_name: string): void {
  // No-op: user ID is now managed by session
  console.warn('setUserId is deprecated, use session management instead');
}

// LocalStorage key for persisting read status locally (backup)
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
 * Hook to track read/unread status of announcements using Google Sheets
 * with local persistence as backup
 */
export function useAnnouncementReadStatus(announcements: Task[]) {
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialize from localStorage for instant hydration
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => getLocalReadIds());
  const userId = getStableUserId();
  const fetchedRef = useRef(false);

  // Fetch read statuses from Google Sheets
  const fetchReadStatuses = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    try {
      const statuses = await gsheetsReadStatusApi.list(userId);
      setReadStatuses(statuses);
      
      // Merge server statuses with local ones
      const serverIds = new Set(statuses.map(s => s.announcement_id));
      setLocalReadIds(prev => {
        const merged = new Set([...prev, ...serverIds]);
        saveLocalReadIds(merged);
        return merged;
      });
    } catch (error) {
      console.error('Error fetching read statuses:', error);
      // On error, keep using local storage backup
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReadStatuses();
  }, [fetchReadStatuses]);

  // Set of read announcement IDs for quick lookup (includes optimistic local reads)
  const readAnnouncementIds = useMemo(() => {
    const ids = new Set(readStatuses.map(s => s.announcement_id));
    // Merge with optimistic local reads
    localReadIds.forEach(id => ids.add(id));
    return ids;
  }, [readStatuses, localReadIds]);

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

    // Optimistic update + persist to localStorage
    setLocalReadIds(prev => {
      const next = new Set(prev);
      unreadIds.forEach(id => next.add(id));
      saveLocalReadIds(next);
      return next;
    });

    try {
      const newStatuses = await gsheetsReadStatusApi.markAsRead(unreadIds, userId);
      setReadStatuses((prev) => [...prev, ...newStatuses]);
    } catch (error) {
      console.error('Error marking announcements as read:', error);
      // Keep optimistic update even on error - localStorage backup ensures persistence
    }
  }, [announcements, readAnnouncementIds, userId]);

  // Mark a single announcement as read (used when opening the modal)
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
        const newStatuses = await gsheetsReadStatusApi.markAsRead([announcementId], userId);
        setReadStatuses((prev) => [...prev, ...newStatuses]);
      } catch (error) {
        console.error('Error marking announcement as read:', error);
        // Keep optimistic update even on error - localStorage backup ensures persistence
      }
    },
    [readAnnouncementIds, userId]
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
