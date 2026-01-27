import { getSession } from '@/lib/auth/session';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  folderId?: string;
  folderUrl?: string;
  error?: string;
}

function base64UrlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function uploadFileToGDrive(
  file: File,
  taskTitle: string
): Promise<UploadResult> {
  const session = getSession();
  
  if (!session) {
    return { success: false, error: 'Unauthorized: Please login first' };
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskTitle', taskTitle);
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'X-App-Session': base64UrlEncodeUtf8(JSON.stringify(session)),
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-to-gdrive`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Upload failed' };
    }
    
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Network error during upload' };
  }
}
