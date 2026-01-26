import { supabase } from '@/integrations/supabase/client';

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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskTitle', taskTitle);

  const { data, error } = await supabase.functions.invoke('upload-to-gdrive', {
    body: formData,
  });

  if (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }

  return data;
}
