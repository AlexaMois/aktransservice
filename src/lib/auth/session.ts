/**
 * Session management for user authentication
 * Stores user session in localStorage with user_id, name, and role
 */

export interface UserSession {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  access_code: string;
}

const SESSION_KEY = 'app_user_session';

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as UserSession;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function isAdmin(): boolean {
  const session = getSession();
  return session?.role === 'admin';
}

export function getUserName(): string {
  const session = getSession();
  return session?.name || 'Аноним';
}

export function getUserId(): string | null {
  const session = getSession();
  return session?.user_id || null;
}

export function getUserRole(): 'admin' | 'user' | null {
  const session = getSession();
  return session?.role || null;
}
