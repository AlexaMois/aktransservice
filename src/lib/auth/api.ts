/**
 * Authentication API calls
 */

import { LoginRequest, LoginResponse } from './types';
import { edgeFetch } from '@/shared/api/edgeFetch';

export async function loginWithAccessCode(request: LoginRequest): Promise<LoginResponse> {
  const response = await edgeFetch('/gsheets-api', {
    method: 'POST',
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
