export type TaskStatus = 'ideas' | 'planned' | 'in-progress' | 'review' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskType = 'idea' | 'problem' | 'task' | 'announcement' | 'question';
export type EffectType = 'security' | 'compliance' | 'reduce_manual_work' | 'process_speed' | 'transparency' | 'audit_prep' | 'financial';
export type ImportanceRating = 'critical' | 'important' | 'can_wait';
export type DigitizationSection = 'documents' | 'onboarding' | 'training' | 'hr_accounting' | 'shifts' | 'reporting' | 'it_systems';

export interface Task {
  id: string;
  title: string;
  summary: string;
  description?: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  effect_type?: EffectType | null;
  importance?: ImportanceRating | null;
  digitization_section?: DigitizationSection | null;
  author: string;
  owner?: string | null;
  url?: string | null;
  input_data_description?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  problem_description?: string | null;
  linked_idea_id?: string | null;
  linked_problem_id?: string | null;
  result_before?: string | null;
  result_action?: string | null;
  result_after?: string | null;
  execution_log?: string | null;
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
  'review': 'На проверке',
  'completed': 'Завершено'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  'high': 'Высокий',
  'medium': 'Средний',
  'low': 'Низкий'
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'idea': 'Предложение',
  'problem': 'Проблема',
  'task': 'Задача',
  'announcement': 'Объявление',
  'question': 'Вопрос'
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  'idea': 'bg-primary/10 text-primary border-primary/20',
  'problem': 'bg-destructive/10 text-destructive border-destructive/20',
  'task': 'bg-chart-1/10 text-chart-5 border-chart-1/20',
  'announcement': 'bg-secondary/10 text-secondary border-secondary/20',
  'question': 'bg-chart-4/10 text-chart-4 border-chart-4/20'
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
  'critical': '1 — Срочно',
  'important': '2 — Важно',
  'can_wait': '3 — Можно позже'
};

// Renamed from "Разделы" to "Отделы"
export const DIGITIZATION_SECTION_LABELS: Record<DigitizationSection, string> = {
  'documents': 'Документы и требования',
  'onboarding': 'Ознакомление сотрудников',
  'training': 'Инструктажи и обучение',
  'hr_accounting': 'Кадры и бухгалтерия',
  'shifts': 'Вахта и участки',
  'reporting': 'Отчётность и проверки',
  'it_systems': 'Информационные системы (1С, порталы)'
};
