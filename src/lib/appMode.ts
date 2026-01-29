/**
 * Unified App Mode configuration
 * Provides a single source of truth for auth/public mode
 */

export type AppMode = 'auth' | 'public';

// Anonymous user ID key in localStorage
const ANON_USER_KEY = 'app_anonymous_user_id';

/**
 * Get current app mode
 * Currently hardcoded to 'public' - can be switched to 'auth' when needed
 */
export function getAppMode(): AppMode {
  return 'public';
}

/**
 * Check if app is in public (no-auth) mode
 */
export function isPublicMode(): boolean {
  return getAppMode() === 'public';
}

/**
 * Get or create anonymous user ID for public mode
 */
function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return 'anon';
  
  let anonId = localStorage.getItem(ANON_USER_KEY);
  if (!anonId) {
    anonId = 'anon_' + crypto.randomUUID().slice(0, 12);
    localStorage.setItem(ANON_USER_KEY, anonId);
  }
  return anonId;
}

/**
 * Get stable user ID regardless of app mode
 * - auth mode: returns session user_id
 * - public mode: returns persistent anon_id from localStorage
 */
export function getStableUserId(): string {
  const mode = getAppMode();
  
  if (mode === 'auth') {
    // Import dynamically to avoid circular deps
    const session = getSessionSafe();
    return session?.user_id || getOrCreateAnonId();
  }
  
  return getOrCreateAnonId();
}

/**
 * Get display name for current user
 * - auth mode: session name
 * - public mode: "Гость • XXXX"
 */
export function getDisplayName(): string {
  const mode = getAppMode();
  
  if (mode === 'auth') {
    const session = getSessionSafe();
    return session?.name || 'Аноним';
  }
  
  const anonId = getOrCreateAnonId();
  const shortId = anonId.replace('anon_', '').slice(0, 4).toUpperCase();
  return `Гость • ${shortId}`;
}

/**
 * Get user role
 * - auth mode: from session
 * - public mode: always 'user' (no special privileges in UI, but backend allows all)
 */
export function getUserRole(): 'admin' | 'user' {
  const mode = getAppMode();
  
  if (mode === 'auth') {
    const session = getSessionSafe();
    return session?.role || 'user';
  }
  
  return 'user';
}

/**
 * Check if user has admin privileges in UI
 * Note: In public mode, backend allows all operations, but UI shows user-level access
 */
export function hasAdminUI(): boolean {
  return getAppMode() === 'auth' && getUserRole() === 'admin';
}

// Helper to safely get session without circular dependency
function getSessionSafe(): { user_id: string; name: string; role: 'admin' | 'user' } | null {
  try {
    const stored = localStorage.getItem('app_user_session');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
