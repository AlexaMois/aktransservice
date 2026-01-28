/**
 * Unified helper for Supabase Edge Functions fetch requests
 */

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface EdgeFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Skip automatic Content-Type header (useful for FormData) */
  skipContentType?: boolean;
}

/**
 * Get the current access token from Supabase session
 * Falls back to anon key if no session exists
 */
async function getAccessToken(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  } catch (error) {
    console.warn('Failed to get session, using anon key:', error);
  }
  return SUPABASE_ANON_KEY;
}

/**
 * Fetch helper for Supabase Edge Functions
 * 
 * @param path - Edge function path (e.g., '/gsheets-api' or 'gsheets-api')
 * @param options - Fetch options
 * @returns Response object
 * @throws Error if response is not ok
 */
export async function edgeFetch(
  path: string,
  options: EdgeFetchOptions = {}
): Promise<Response> {
  const { headers = {}, skipContentType = false, ...fetchOptions } = options;

  // Normalize path - ensure it starts with /functions/v1/
  const normalizedPath = path.startsWith('/') 
    ? `/functions/v1${path}`
    : `/functions/v1/${path}`;

  // Get access token (user session or anon key)
  const accessToken = await getAccessToken();

  // Build headers - always include apikey, Authorization uses session token or anon key
  const finalHeaders: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    ...headers,
  };

  // Add Content-Type for JSON unless skipped (e.g., for FormData)
  if (!skipContentType && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${SUPABASE_URL}${normalizedPath}`, {
    ...fetchOptions,
    headers: finalHeaders,
  });

  return response;
}

/**
 * Fetch helper that parses JSON response and throws on error
 */
/**
 * Type guard for error response objects
 */
function isErrorResponse(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'string'
  );
}

/**
 * Fetch helper that parses JSON response and throws on error
 */
export async function edgeFetchJson<T = unknown>(
  path: string,
  options: EdgeFetchOptions = {}
): Promise<T> {
  const response = await edgeFetch(path, options);

  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Ошибка сервера (${response.status}). Попробуйте обновить страницу.`);
  }

  if (!response.ok) {
    const errorMessage = isErrorResponse(data) ? data.error : `HTTP Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

/**
 * Base64url encode UTF-8 string (for session headers with Cyrillic)
 */
export function base64UrlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
