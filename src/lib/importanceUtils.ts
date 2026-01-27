import { ImportanceRating } from '@/types/task';

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
        borderClass: 'border-l-4 border-l-destructive',
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
        label: '1',
      };
    case 'important':
      return {
        borderClass: 'border-l-4 border-l-chart-4',
        badgeClass: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
        label: '2',
      };
    case 'can_wait':
      return {
        borderClass: 'border-l-4 border-l-muted-foreground/30',
        badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/20',
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
