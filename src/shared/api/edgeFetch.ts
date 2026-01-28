/**
 * Unified helper for Supabase Edge Functions fetch requests
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface EdgeFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Skip automatic Content-Type header (useful for FormData) */
  skipContentType?: boolean;
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

  // Build headers
  const finalHeaders: Record<string, string> = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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
export async function edgeFetchJson<T = unknown>(
  path: string,
  options: EdgeFetchOptions = {}
): Promise<T> {
  const response = await edgeFetch(path, options);

  const text = await response.text();
  let data: T;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Ошибка сервера (${response.status}). Попробуйте обновить страницу.`);
  }

  if (!response.ok) {
    const errorData = data as { error?: string };
    throw new Error(errorData?.error || `HTTP Error ${response.status}`);
  }

  return data;
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
