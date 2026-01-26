/**
 * User types for authentication system
 */

export interface AppUser {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  access_code: string;
  active: boolean;
  created_at: string;
}

export interface LoginRequest {
  name: string;
  access_code: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AppUser;
  error?: string;
}
