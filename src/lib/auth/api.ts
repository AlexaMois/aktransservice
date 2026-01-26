/**
 * Authentication API calls
 */

import { LoginRequest, LoginResponse } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function loginWithAccessCode(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: 'login',
      entity: 'users',
      data: {
        name: request.name.trim(),
        access_code: request.access_code.trim(),
      },
    }),
  });

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Ошибка входа',
    };
  }

  return {
    success: true,
    user: result.data,
  };
}
