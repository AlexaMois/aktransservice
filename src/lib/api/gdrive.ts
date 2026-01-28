import { getSession } from '@/lib/auth/session';
import { edgeFetch, base64UrlEncodeUtf8 } from '@/shared/api/edgeFetch';

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  folderId?: string;
  folderUrl?: string;
  error?: string;
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
    'X-App-Session': base64UrlEncodeUtf8(JSON.stringify(session)),
  };

  try {
    const response = await edgeFetch('/upload-to-gdrive', {
      method: 'POST',
      headers,
      body: formData,
      skipContentType: true, // FormData sets its own Content-Type with boundary
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
