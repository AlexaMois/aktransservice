import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface UserSession {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
}

interface FeedbackPayload {
  type: string;
  title: string;
  description: string;
  area: string;
  urgency?: string | null;
  screenshot_base64?: string | null;
  screenshot_name?: string | null;
  // Public mode: user identity from request body
  user_id?: string;
  user_name?: string;
}

const FEEDBACK_COLUMNS = [
  'id', 'user_id', 'user_name', 'role', 'type', 'title', 
  'description', 'area', 'urgency', 'screenshot_url', 'created_at'
];

const USER_COLUMNS = ['user_id', 'name', 'role', 'telegram_id', 'active'];

async function getAccessToken(serviceAccountKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: serviceAccountKey.token_uri,
    exp,
    iat: now,
  };
  
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
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
  
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  const tokenResponse = await fetch(serviceAccountKey.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
  }
  
  return tokenData.access_token;
}

function getSpreadsheetId(): string {
  const rawValue = Deno.env.get('GOOGLE_SHEETS_ID') || '';
  const urlMatch = rawValue.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  return rawValue;
}

async function ensureSheetExists(accessToken: string, sheetName: string, headers: string[], spreadsheetId: string): Promise<void> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!1:1`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (!data.values || data.values.length === 0) {
        await updateRow(accessToken, sheetName, 1, headers, spreadsheetId);
      }
      return;
    }
    
    // Create sheet
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          addSheet: { properties: { title: sheetName } }
        }]
      }),
    });
    
    if (createResponse.ok) {
      await appendRow(accessToken, sheetName, headers, spreadsheetId);
    }
  } catch (e) {
    console.log('Sheet check/create error:', e);
  }
}

async function appendRow(accessToken: string, sheetName: string, values: string[], spreadsheetId: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:append?valueInputOption=RAW`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to append row: ${error.error?.message}`);
  }
}

async function updateRow(accessToken: string, sheetName: string, rowIndex: number, values: string[], spreadsheetId: string): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });
}

async function getSheetData(accessToken: string, sheetName: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  return data.values || [];
}

function decodeBase64UrlUtf8(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function validateSession(
  sessionHeader: string | null, 
  accessToken: string, 
  spreadsheetId: string
): Promise<UserSession | null> {
  if (!sessionHeader) return null;
  
  try {
    const raw = sessionHeader.trim();
    const json = raw.startsWith('{') ? raw : decodeBase64UrlUtf8(raw);
    const session: UserSession = JSON.parse(json);
    
    if (!session.user_id) return null;
    
    // Verify user exists in whitelist
    await ensureSheetExists(accessToken, 'Users', USER_COLUMNS, spreadsheetId);
    const rows = await getSheetData(accessToken, 'Users', spreadsheetId);
    
    if (rows.length <= 1) return null;
    
    const headers = rows[0];
    const userIdIndex = headers.indexOf('user_id');
    const activeIndex = headers.indexOf('active');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row[userIdIndex] === session.user_id && 
        (row[activeIndex] === 'true' || row[activeIndex] === 'TRUE')
      ) {
        return session;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function uploadScreenshotToGDrive(
  accessToken: string, 
  base64Data: string, 
  fileName: string,
  folderId?: string
): Promise<string> {
  // Decode base64 to binary
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Determine mime type from base64 or default to png
  const mimeType = 'image/png';
  
  // Create file metadata
  const metadata: Record<string, unknown> = {
    name: `feedback_${Date.now()}_${fileName || 'screenshot.png'}`,
    mimeType,
  };
  
  if (folderId) {
    metadata.parents = [folderId];
  }
  
  // Use multipart upload
  const boundary = '-------feedback_upload_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const metadataString = JSON.stringify(metadata);
  
  // Build multipart body
  const bodyParts = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataString,
    delimiter,
    `Content-Type: ${mimeType}\r\n`,
    'Content-Transfer-Encoding: base64\r\n\r\n',
    base64Data,
    closeDelimiter,
  ];
  
  const body = bodyParts.join('');
  
  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  
  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error('Drive upload error:', error);
    throw new Error('Failed to upload screenshot');
  }
  
  const fileData = await uploadResponse.json();
  
  // Make file publicly accessible
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });
  
  // Return direct link
  return `https://drive.google.com/uc?id=${fileData.id}`;
}

function objectToRow(obj: Record<string, unknown>, columns: string[]): string[] {
  return columns.map(col => {
    const value = obj[col];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const serviceAccountKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyRaw) {
      throw new Error('Google integration not configured');
    }
    
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_ID not configured');
    }
    
    const serviceAccountKey: ServiceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);
    
    const payload: FeedbackPayload = await req.json();
    
    // Support both session-based auth and public mode
    // In public mode, user_id and user_name come from request body
    let userId: string;
    let userName: string;
    let userRole: string = 'user';
    
    const sessionHeader = req.headers.get('X-App-Session');
    const session = await validateSession(sessionHeader, accessToken, spreadsheetId);
    
    if (session) {
      // Session auth mode
      userId = session.user_id;
      userName = session.name;
      userRole = session.role;
    } else if (payload.user_id) {
      // Public mode - use provided identity
      userId = payload.user_id;
      userName = payload.user_name || 'Гость';
    } else {
      // No identity provided
      return new Response(
        JSON.stringify({ success: false, error: 'User identity required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required fields
    if (!payload.type || !payload.title || !payload.description || !payload.area) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate title length
    if (payload.title.length > 150) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title too long (max 150 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle screenshot upload
    let screenshotUrl: string | null = null;
    if (payload.screenshot_base64) {
      try {
        screenshotUrl = await uploadScreenshotToGDrive(
          accessToken, 
          payload.screenshot_base64, 
          payload.screenshot_name || 'screenshot.png'
        );
      } catch (e) {
        console.error('Screenshot upload failed:', e);
        // Continue without screenshot - it's optional
      }
    }
    
    // Ensure Feedback sheet exists
    await ensureSheetExists(accessToken, 'Feedback', FEEDBACK_COLUMNS, spreadsheetId);
    
    // Create feedback entry using resolved user identity
    const feedbackEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      user_name: userName,
      role: userRole,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      area: payload.area,
      urgency: payload.urgency || '',
      screenshot_url: screenshotUrl || '',
      created_at: new Date().toISOString(),
    };
    
    await appendRow(accessToken, 'Feedback', objectToRow(feedbackEntry, FEEDBACK_COLUMNS), spreadsheetId);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Feedback error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
