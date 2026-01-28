/**
 * @deprecated Import from '@/entities/task' instead
 * This file is kept for backwards compatibility during migration
 */

// Re-export everything from the new location
export * from '@/entities/task/model';

// Additional types that are not part of the task entity
export interface Announcement {
  id: string;
  title: string;
  description: string;
  published_at: string;
  target_audience: string;
  related_task_ids?: string[];
  document_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DigitizationQueueItem {
  id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  created_at: string;
}

export interface NotAutomatingItem {
  id: string;
  title: string;
  reason: string;
  sort_order: number;
  created_at: string;
}

export interface ExperimentItem {
  id: string;
  title: string;
  description?: string | null;
  hypothesis?: string | null;
  sort_order: number;
  created_at: string;
}
