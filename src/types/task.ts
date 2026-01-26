export type TaskStatus = 'ideas' | 'planned' | 'in-progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskType = 'idea' | 'problem';
export type EffectType = 'security' | 'compliance' | 'reduce_manual_work' | 'process_speed' | 'transparency' | 'audit_prep' | 'financial';
export type ImportanceRating = 'critical' | 'important' | 'can_wait';

export interface Task {
  id: string;
  title: string;
  description: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  effect_type?: EffectType | null;
  importance?: ImportanceRating | null;
  author: string;
  owner?: string | null;
  input_data_description?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  problem_description?: string | null;
  linked_idea_id?: string | null;
  linked_problem_id?: string | null;
  result_before?: string | null;
  result_action?: string | null;
  result_after?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: string;
  text: string;
  created_at: string;
}

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

export const STATUS_LABELS: Record<TaskStatus, string> = {
  'ideas': 'Идеи',
  'planned': 'Запланировано',
  'in-progress': 'В разработке',
  'completed': 'Завершено'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  'high': 'Высокий',
  'medium': 'Средний',
  'low': 'Низкий'
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'idea': 'Идея',
  'problem': 'Проблема'
};

export const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  'security': 'Безопасность',
  'compliance': 'Соблюдение требований',
  'reduce_manual_work': 'Снижение ручного труда',
  'process_speed': 'Скорость процессов',
  'transparency': 'Прозрачность',
  'audit_prep': 'Подготовка к проверкам',
  'financial': 'Финансовый эффект'
};

export const IMPORTANCE_LABELS: Record<ImportanceRating, string> = {
  'critical': 'Критично',
  'important': 'Важно',
  'can_wait': 'Можно подождать'
};
