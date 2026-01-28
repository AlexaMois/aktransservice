/**
 * User types for authentication system
 */

export interface AppUser {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  telegram_id: string;
  active: boolean;
}

export interface LoginRequest {
  user_id: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AppUser;
  error?: string;
  code?: string;
}
