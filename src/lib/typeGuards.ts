/**
 * Type guards for runtime type checking
 * Replaces unsafe casts with explicit validation
 */

import { Task, TaskStatus, TaskType, TaskPriority, ImportanceRating, EffectType, Department } from '@/entities/task';
import { Announcement, DigitizationQueueItem, NotAutomatingItem, ExperimentItem } from '@/types/task';

// Valid enum values for validation
const VALID_TASK_STATUSES: TaskStatus[] = ['ideas', 'planned', 'in-progress', 'review', 'completed'];
const VALID_TASK_TYPES: TaskType[] = ['idea', 'problem', 'task', 'announcement', 'question'];
const VALID_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];
const VALID_IMPORTANCE: ImportanceRating[] = ['critical', 'important', 'can_wait'];
const VALID_EFFECT_TYPES: EffectType[] = ['security', 'compliance', 'reduce_manual_work', 'process_speed', 'transparency', 'audit_prep', 'financial'];
const VALID_DEPARTMENTS: Department[] = ['digitization_it', 'finance', 'hr', 'legal_safety', 'portal_culture', 'transport_production', 'management'];

/**
 * Check if value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Check if value is a valid TaskStatus
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && VALID_TASK_STATUSES.includes(value as TaskStatus);
}

/**
 * Check if value is a valid TaskType
 */
export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && VALID_TASK_TYPES.includes(value as TaskType);
}

/**
 * Check if value is a valid TaskPriority
 */
export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && VALID_PRIORITIES.includes(value as TaskPriority);
}

/**
 * Check if value is a valid ImportanceRating
 */
export function isImportanceRating(value: unknown): value is ImportanceRating {
  return value === null || (typeof value === 'string' && VALID_IMPORTANCE.includes(value as ImportanceRating));
}

/**
 * Check if value is a valid EffectType
 */
export function isEffectType(value: unknown): value is EffectType {
  return value === null || (typeof value === 'string' && VALID_EFFECT_TYPES.includes(value as EffectType));
}

/**
 * Check if value is a valid Department
 */
export function isDepartment(value: unknown): value is Department {
  return value === null || (typeof value === 'string' && VALID_DEPARTMENTS.includes(value as Department));
}

/**
 * Check if an object has expected Task shape
 */
export function isTaskLike(value: unknown): value is Task {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.author === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string' &&
    isTaskStatus(value.status) &&
    isTaskType(value.task_type) &&
    isTaskPriority(value.priority)
  );
}

/**
 * Check if an object has expected Announcement shape
 */
export function isAnnouncementLike(value: unknown): value is Announcement {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.published_at === 'string' &&
    typeof value.target_audience === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

/**
 * Check if an object has expected DigitizationQueueItem shape
 */
export function isDigitizationQueueItem(value: unknown): value is DigitizationQueueItem {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.sort_order === 'number' &&
    typeof value.created_at === 'string'
  );
}

/**
 * Check if an object has expected NotAutomatingItem shape
 */
export function isNotAutomatingItem(value: unknown): value is NotAutomatingItem {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.sort_order === 'number' &&
    typeof value.created_at === 'string'
  );
}

/**
 * Check if an object has expected ExperimentItem shape
 */
export function isExperimentItem(value: unknown): value is ExperimentItem {
  if (!isObject(value)) return false;
  
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.sort_order === 'number' &&
    typeof value.created_at === 'string'
  );
}

/**
 * Type guard for error responses
 */
export function hasErrorProperty(value: unknown): value is { error: string } {
  return isObject(value) && typeof value.error === 'string';
}

/**
 * Safe string extraction from unknown value
 */
export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Map raw database row to Task with validation
 */
export function mapToTask(row: Record<string, unknown>): Task {
  return {
    id: asString(row.id),
    title: asString(row.title),
    summary: asString(row.summary) || asString(row.description),
    description: row.description as string | null | undefined,
    task_type: isTaskType(row.task_type) ? row.task_type : 'idea',
    status: isTaskStatus(row.status) ? row.status : 'ideas',
    priority: isTaskPriority(row.priority) ? row.priority : 'medium',
    effect_type: isEffectType(row.effect_type) ? row.effect_type : null,
    importance: isImportanceRating(row.importance) ? row.importance : null,
    department: isDepartment(row.department) ? row.department : null,
    digitization_section: row.digitization_section as Task['digitization_section'],
    author: asString(row.author) || 'Аноним',
    owner: row.owner as string | null | undefined,
    url: row.url as string | null | undefined,
    input_data_description: row.input_data_description as string | null | undefined,
    file_name: row.file_name as string | null | undefined,
    file_url: row.file_url as string | null | undefined,
    problem_description: row.problem_description as string | null | undefined,
    linked_idea_id: row.linked_idea_id as string | null | undefined,
    linked_problem_id: row.linked_problem_id as string | null | undefined,
    result_before: row.result_before as string | null | undefined,
    result_action: row.result_action as string | null | undefined,
    result_after: row.result_after as string | null | undefined,
    execution_log: row.execution_log as string | null | undefined,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

/**
 * Map raw database row to Announcement with validation
 */
export function mapToAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: asString(row.description),
    published_at: asString(row.published_at),
    target_audience: asString(row.target_audience) || 'all',
    related_task_ids: Array.isArray(row.related_task_ids) ? row.related_task_ids.filter((id): id is string => typeof id === 'string') : undefined,
    document_url: row.document_url as string | null | undefined,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

/**
 * Map raw database row to DigitizationQueueItem
 */
export function mapToDigitizationQueueItem(row: Record<string, unknown>): DigitizationQueueItem {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: row.description as string | null | undefined,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: asString(row.created_at),
  };
}

/**
 * Map raw database row to NotAutomatingItem
 */
export function mapToNotAutomatingItem(row: Record<string, unknown>): NotAutomatingItem {
  return {
    id: asString(row.id),
    title: asString(row.title),
    reason: asString(row.reason),
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: asString(row.created_at),
  };
}

/**
 * Map raw database row to ExperimentItem
 */
export function mapToExperimentItem(row: Record<string, unknown>): ExperimentItem {
  return {
    id: asString(row.id),
    title: asString(row.title),
    description: row.description as string | null | undefined,
    hypothesis: row.hypothesis as string | null | undefined,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: asString(row.created_at),
  };
}
