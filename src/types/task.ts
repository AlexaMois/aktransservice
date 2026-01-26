export type TaskStatus = 'ideas' | 'planned' | 'in-progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  author: string;
  owner?: string;
  priority: TaskPriority;
  inputDataDescription: string;
  fileUrl?: string;
  fileName?: string;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
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
