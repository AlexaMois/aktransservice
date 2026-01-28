import { ImportanceRating } from '@/entities/task';

/**
 * Get visual styles for importance badge and card border
 */
export function getImportanceStyles(importance: ImportanceRating | null | undefined): {
  borderClass: string;
  badgeClass: string;
  label: string;
} {
  switch (importance) {
    case 'critical':
      return {
        borderClass: 'border-l-4 border-l-red-500',
        badgeClass: 'bg-red-500/15 text-red-600 border-red-500/30',
        label: '1',
      };
    case 'important':
      return {
        borderClass: 'border-l-4 border-l-orange-500',
        badgeClass: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
        label: '2',
      };
    case 'can_wait':
      return {
        borderClass: 'border-l-4 border-l-green-500',
        badgeClass: 'bg-green-500/15 text-green-600 border-green-500/30',
        label: '3',
      };
    default:
      // No importance set - neutral style
      return {
        borderClass: '',
        badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20',
        label: '—',
      };
  }
}

/**
 * Validate importance value - returns valid ImportanceRating or null
 */
export function validateImportance(value: string | null | undefined): ImportanceRating | null {
  if (!value) return null;
  const valid: ImportanceRating[] = ['critical', 'important', 'can_wait'];
  return valid.includes(value as ImportanceRating) ? (value as ImportanceRating) : null;
}
