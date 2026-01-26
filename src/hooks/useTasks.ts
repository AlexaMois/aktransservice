import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task';

const STORAGE_KEY = 'roadmap-tasks';

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Интеграция с 1С',
    description: 'Необходимо настроить автоматическую синхронизацию данных с системой 1С для учета транспортных операций.',
    status: 'in-progress',
    author: 'Логистика',
    owner: 'Иванов А.С.',
    priority: 'high',
    inputDataDescription: 'Техническое задание на интеграцию',
    fileUrl: '#',
    fileName: 'ТЗ_интеграция_1С.pdf',
    comments: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    title: 'Мобильное приложение для водителей',
    description: 'Разработать мобильное приложение для водителей с функцией отслеживания маршрутов и подтверждения доставок.',
    status: 'planned',
    author: 'IT отдел',
    owner: 'Петров Б.В.',
    priority: 'high',
    inputDataDescription: 'Макеты интерфейса и требования',
    fileUrl: '#',
    fileName: 'mobile_app_requirements.docx',
    comments: [],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    title: 'Оптимизация маршрутов',
    description: 'Внедрить алгоритм автоматической оптимизации маршрутов для снижения затрат на топливо.',
    status: 'ideas',
    author: 'Аналитика',
    priority: 'medium',
    inputDataDescription: 'Аналитический отчет по текущим маршрутам',
    fileUrl: '#',
    fileName: 'routes_analysis.xlsx',
    comments: [],
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
  {
    id: '4',
    title: 'Система уведомлений клиентов',
    description: 'Автоматические SMS и email уведомления клиентов о статусе доставки.',
    status: 'completed',
    author: 'Маркетинг',
    owner: 'Сидорова К.Л.',
    priority: 'medium',
    inputDataDescription: 'Шаблоны уведомлений',
    fileUrl: '#',
    fileName: 'notification_templates.docx',
    comments: [],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-05'),
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((t: Task) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }));
    }
    return initialTasks;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'status'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      status: 'ideas',
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status, updatedAt: new Date() }
          : task
      )
    );
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  return {
    tasks,
    addTask,
    updateTaskStatus,
    getTasksByStatus,
  };
}
