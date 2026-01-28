/**
 * Text normalization utilities for task fields
 * Ensures consistent formatting across all cards
 */

/**
 * Normalize text content for storage
 * - Trims leading/trailing whitespace
 * - Normalizes line breaks (converts \r\n to \n)
 * - Removes excessive blank lines (max 2 consecutive)
 * - Removes trailing spaces from each line
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove trailing spaces from each line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Remove excessive blank lines (max 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim overall
    .trim();
}

/**
 * Normalize a task object's text fields before saving
 */
export function normalizeTaskFields<T extends Record<string, unknown>>(task: T): T {
  const textFields = [
    'title',
    'summary',
    'description',
    'problem_description',
    'input_data_description',
    'execution_log',
    'result_before',
    'result_action',
    'result_after',
  ] as const;

  const normalized = { ...task };

  for (const field of textFields) {
    const value = normalized[field];
    if (field in normalized && typeof value === 'string') {
      (normalized as Record<string, unknown>)[field] = normalizeText(value);
    }
  }

  return normalized;
}

/**
 * Check if a string looks like a URL
 */
export function isUrl(text: string): boolean {
  if (!text) return false;
  const urlPattern = /^(https?:\/\/|www\.)/i;
  return urlPattern.test(text.trim());
}

/**
 * Truncate URL for display while keeping it functional
 */
export function formatDisplayUrl(url: string, maxLength: number = 50): string {
  if (!url || url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname;
    
    if (host.length + 10 >= maxLength) {
      return host.substring(0, maxLength - 3) + '...';
    }
    
    const remainingLength = maxLength - host.length - 3;
    const truncatedPath = path.length > remainingLength 
      ? path.substring(0, remainingLength) + '...'
      : path;
    
    return host + truncatedPath;
  } catch {
    return url.substring(0, maxLength - 3) + '...';
  }
}
