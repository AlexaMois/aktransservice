import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safe date formatter - returns fallback for invalid dates
 */
export function formatDateSafe(
  dateValue: string | Date | null | undefined,
  formatStr: string = "d MMM yyyy",
  fallback: string = "—"
): string {
  if (!dateValue) return fallback;
  
  try {
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (!isValid(date)) return fallback;
    return format(date, formatStr, { locale: ru });
  } catch {
    return fallback;
  }
}
