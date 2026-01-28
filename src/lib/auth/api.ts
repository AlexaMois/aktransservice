/**
 * Authentication API calls
 */

import { LoginRequest, LoginResponse } from './types';
import { edgeFetch } from '@/shared/api/edgeFetch';

export async function loginWithUserId(request: LoginRequest): Promise<LoginResponse> {
  const response = await edgeFetch('/gsheets-api', {
    method: 'POST',
    body: JSON.stringify({
      action: 'login',
      entity: 'users',
      data: {
        user_id: request.user_id.trim(),
      },
    }),
  });

  const result = await response.json();

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Ошибка входа',
      code: result.code,
    };
  }

  return {
    success: true,
    user: result.data,
  };
}
