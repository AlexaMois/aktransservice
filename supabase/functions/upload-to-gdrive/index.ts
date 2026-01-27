import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get allowed origins from environment or use defaults
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean);
const DEFAULT_ORIGINS = [
  'https://aktransservice.lovable.app',
  'https://id-preview--9c08b346-b23f-479f-b9d3-6a66d9b40422.lovable.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS];
  
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : DEFAULT_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-session',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// File upload validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

// Parent folder ID from environment (fallback to hardcoded for backwards compatibility)
const PARENT_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_PARENT_FOLDER_ID') || '194gw_AuUPcMI4ttdkO9dQaDzeiZNpyT4';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface UserSession {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  access_code: string;
}

// Decode base64url-encoded session header
function decodeSessionHeader(sessionHeader: string): UserSession | null {
  try {
    const b64 = sessionHeader.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const session = JSON.parse(json);
    
    if (!session.user_id || !session.access_code) return null;
    return session as UserSession;
  } catch {
    return null;
  }
}

async function getAccessToken(serviceAccountKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: serviceAccountKey.token_uri,
    exp: exp,
    iat: now,
  };
  
  // Create JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import private key and sign
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = serviceAccountKey.private_key.replace(pemHeader, '').replace(pemFooter, '').replace(/\n/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch(serviceAccountKey.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', tokenData);
    throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
  }
  
  return tokenData.access_token;
}

async function createFolder(accessToken: string, folderName: string, parentId: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Create folder failed:', data);
    throw new Error(`Failed to create folder: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.id;
}

async function uploadFile(
  accessToken: string, 
  fileContent: ArrayBuffer, 
  fileName: string, 
  mimeType: string, 
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };
  
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const metadataString = JSON.stringify(metadata);
  const fileBytes = new Uint8Array(fileContent);
  
  // Build multipart body
  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataString}${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const part2 = fileBytes;
  const part3 = encoder.encode(closeDelimiter);
  
  const body = new Uint8Array(part1.length + part2.length + part3.length);
  body.set(part1, 0);
  body.set(part2, part1.length);
  body.set(part3, part1.length + part2.length);
  
  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );
  
  const uploadData = await uploadResponse.json();
  
  if (!uploadResponse.ok) {
    console.error('Upload failed:', uploadData);
    throw new Error(`Failed to upload file: ${uploadData.error?.message || 'Unknown error'}`);
  }
  
  // Files remain private to the service account
  // Access is provided through the application interface only
  // No public permissions are set - this is intentional for security
  
  return {
    id: uploadData.id,
    webViewLink: uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // SECURITY: Validate session - require authenticated user
    const sessionHeader = req.headers.get('X-App-Session');
    if (!sessionHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: No session provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const session = decodeSessionHeader(sessionHeader);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`File upload requested by user: ${session.name} (${session.user_id})`);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const taskTitle = formData.get('taskTitle') as string;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!taskTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // SECURITY: Validate file type
    const mimeType = file.type || 'application/octet-stream';
    if (mimeType !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({ success: false, error: 'File type not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const serviceAccountKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyRaw) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Google Drive integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const serviceAccountKey: ServiceAccountKey = JSON.parse(serviceAccountKeyRaw);
    
    console.log('Getting access token...');
    const accessToken = await getAccessToken(serviceAccountKey);
    
    console.log('Creating folder for task:', taskTitle);
    const folderId = await createFolder(accessToken, taskTitle, PARENT_FOLDER_ID);
    console.log('Created folder:', folderId);
    
    console.log('Uploading file:', file.name);
    const fileContent = await file.arrayBuffer();
    const result = await uploadFile(
      accessToken,
      fileContent,
      file.name,
      mimeType,
      folderId
    );
    console.log('File uploaded:', result);
    
    return new Response(
      JSON.stringify({
        success: true,
        fileId: result.id,
        fileUrl: result.webViewLink,
        folderId: folderId,
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to upload file' // Generic error message for security
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
