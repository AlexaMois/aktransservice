import { Task, TaskComment, Announcement } from '@/types/task';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check if Google Sheets mode is enabled (by checking for SHEETS_ID in localStorage)
export const isGSheetsMode = () => {
  return !!localStorage.getItem('GOOGLE_SHEETS_ID');
};

export const getGSheetsId = () => {
  return localStorage.getItem('GOOGLE_SHEETS_ID');
};

export const setGSheetsId = (id: string) => {
  localStorage.setItem('GOOGLE_SHEETS_ID', id);
};

async function callGSheetsAPI(action: string, entity: string, data?: any, id?: string) {
  const sheetsId = getGSheetsId();
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, entity, data, id }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'API call failed');
  }
  
  return result.data;
}

// Tasks API
export const gsheetsTasksApi = {
  async list(): Promise<Task[]> {
    const data = await callGSheetsAPI('list', 'tasks');
    return data.sort((a: Task, b: Task) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  
  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    return callGSheetsAPI('create', 'tasks', task);
  },
  
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    return callGSheetsAPI('update', 'tasks', updates, id);
  },
  
  async delete(id: string): Promise<void> {
    return callGSheetsAPI('delete', 'tasks', null, id);
  },
};

// Announcements API
export const gsheetsAnnouncementsApi = {
  async list(): Promise<Announcement[]> {
    const data = await callGSheetsAPI('list', 'announcements');
    return data.sort((a: Announcement, b: Announcement) => 
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  },
  
  async create(announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>): Promise<Announcement> {
    return callGSheetsAPI('create', 'announcements', announcement);
  },
  
  async update(id: string, updates: Partial<Announcement>): Promise<Announcement> {
    return callGSheetsAPI('update', 'announcements', updates, id);
  },
  
  async delete(id: string): Promise<void> {
    return callGSheetsAPI('delete', 'announcements', null, id);
  },
};

// Comments API
export const gsheetsCommentsApi = {
  async list(taskId?: string): Promise<TaskComment[]> {
    const data = await callGSheetsAPI('list', 'comments', { task_id: taskId });
    return data.sort((a: TaskComment, b: TaskComment) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },
  
  async create(comment: { task_id: string; author: string; text: string }): Promise<TaskComment> {
    return callGSheetsAPI('create', 'comments', comment);
  },
};

// Initialize Google Sheets with migration
export async function initGoogleSheets(existingTasks: Task[], existingAnnouncements: Announcement[]): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/gsheets-init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ existingTasks, existingAnnouncements }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to initialize Google Sheets');
  }
  
  // Save the spreadsheet ID for future use
  setGSheetsId(result.spreadsheetId);
  
  return result.spreadsheetUrl;
}
