import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Get allowed origins from environment or use defaults
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean);
const DEFAULT_ORIGINS = [
  'https://aktransservice.lovable.app',
  'https://id-preview--9c08b346-b23f-479f-b9d3-6a66d9b40422.lovable.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS];
  
  // Check if origin is allowed
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.lovable.app') || // Allow all lovable.app subdomains
    origin.endsWith('.lovableproject.com') // Allow all lovableproject.com subdomains for development
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : DEFAULT_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-session, x-app-secret-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Google Sheets configuration
const getSpreadsheetId = () => {
  const rawValue = Deno.env.get('GOOGLE_SHEETS_ID') || '';
  const urlMatch = rawValue.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  return rawValue;
};

const SHEETS = {
  tasks: 'Tasks',
  announcements: 'Announcements',
  comments: 'Comments',
  readStatus: 'ReadStatus',
  users: 'Users',
  userRoles: 'UserRoles',
  accessCodes: 'AccessCodes',
  loginLogs: 'LoginLogs',
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface AppUser {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
  telegram_id: string;
  active: boolean;
}

interface UserRoleRow {
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface AccessCodeEntry {
  code: string;
  role: 'admin' | 'user';
  active: boolean;
  created_at: string;
}

interface UserSession {
  user_id: string;
  name: string;
  role: 'admin' | 'user';
}

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
  
  const encoder = new TextEncoder();
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

// Column mappings
// NOTE: effect_type and digitization_section are DEPRECATED - kept for backwards compatibility
// New fields: department, task_scope, due_date, reminder_sent
const TASK_COLUMNS = [
  'id', 'title', 'summary', 'description', 'task_type', 'status', 'priority',
  'effect_type', 'importance', 'department', 'task_scope', 'author', 'owner', 'url', 'input_data_description',
  'file_name', 'file_url', 'problem_description', 'linked_idea_id', 'linked_problem_id',
  'result_before', 'result_action', 'result_after', 'execution_log', 
  'due_date', 'reminder_sent', 'created_at', 'updated_at',
  'digitization_section' // DEPRECATED - kept for backwards compatibility
];

const ANNOUNCEMENT_COLUMNS = [
  'id', 'title', 'description', 'published_at', 'target_audience', 'document_url',
  'related_task_ids', 'created_at', 'updated_at'
];

const COMMENT_COLUMNS = ['id', 'task_id', 'author', 'text', 'created_at'];
const READ_STATUS_COLUMNS = ['id', 'announcement_id', 'user_id', 'read_at'];
const USER_COLUMNS = ['user_id', 'name', 'role', 'telegram_id', 'active'];
const USER_ROLE_COLUMNS = ['user_id', 'role', 'created_at'];
const ACCESS_CODE_COLUMNS = ['code', 'role', 'active', 'created_at'];
const LOGIN_LOG_COLUMNS = ['id', 'user_id', 'name', 'role', 'timestamp'];

// Helper to check if user has logged in before
async function hasUserLoggedBefore(accessToken: string, spreadsheetId: string, userId: string): Promise<boolean> {
  try {
    await ensureSheetExists(accessToken, SHEETS.loginLogs, LOGIN_LOG_COLUMNS, spreadsheetId);
    const rows = await getSheetData(accessToken, SHEETS.loginLogs, spreadsheetId);
    if (rows.length <= 1) return false;
    
    const headers = rows[0];
    const userIdIndex = idx(headers, 'user_id');
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][userIdIndex] === userId) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.log('Login log check error (non-fatal):', e);
    return false;
  }
}

// Log first login to LoginLogs sheet
async function logFirstLogin(accessToken: string, spreadsheetId: string, user: AppUser): Promise<void> {
  try {
    await ensureSheetExists(accessToken, SHEETS.loginLogs, LOGIN_LOG_COLUMNS, spreadsheetId);
    const logEntry = {
      id: crypto.randomUUID(),
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
    };
    await appendRow(accessToken, SHEETS.loginLogs, objectToRow(logEntry, LOGIN_LOG_COLUMNS), spreadsheetId);
  } catch (e) {
    console.log('Login log write error (non-fatal):', e);
  }
}
function idx(headers: string[], key: string): number {
  return headers.indexOf(key);
}

// Sheet helper functions
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
    
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title: sheetName }
          }
        }]
      }),
    });
    
    if (createResponse.ok) {
      await appendRow(accessToken, sheetName, headers, spreadsheetId);
    }
  } catch (e) {
    console.log('Sheet check/create error (non-fatal):', e);
  }
}

function rowToObject(row: string[], headers: string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((header, index) => {
    const value = row[index] || null;
    // Convert 'true'/'false' strings to booleans for boolean fields
    if (header === 'active' || header === 'reminder_sent') {
      obj[header] = value === 'true' || value === 'TRUE';
    } else {
      obj[header] = value === '' ? null : value;
    }
  });
  return obj;
}

function objectToRow(obj: Record<string, any>, columns: string[]): string[] {
  return columns.map(col => {
    const value = obj[col];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return JSON.stringify(value);
    return String(value);
  });
}

async function getSheetData(accessToken: string, sheetName: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get sheet data: ${response.status} - ${errorText.substring(0, 200)}`);
  }
  
  const data = await response.json();
  return data.values || [];
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
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update row: ${error.error?.message}`);
  }
}

async function deleteRow(accessToken: string, sheetName: string, rowIndex: number, spreadsheetId: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaResponse = await fetch(metaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const metaData = await metaResponse.json();
  const sheet = metaData.sheets?.find((s: any) => s.properties.title === sheetName);
  
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  
  const sheetId = sheet.properties.sheetId;
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          }
        }
      }]
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to delete row: ${error.error?.message}`);
  }
}

async function getRoleForUser(accessToken: string, spreadsheetId: string, userId: string): Promise<'admin' | 'user'> {
  await ensureSheetExists(accessToken, SHEETS.userRoles, USER_ROLE_COLUMNS, spreadsheetId);
  const rows = await getSheetData(accessToken, SHEETS.userRoles, spreadsheetId);
  if (rows.length <= 1) return 'user';
  const headers = rows[0];
  const userIdIndex = idx(headers, 'user_id');
  const roleIndex = idx(headers, 'role');
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[userIdIndex] === userId && row[roleIndex] === 'admin') return 'admin';
  }
  return 'user';
}

async function getAccessCodeEntry(accessToken: string, spreadsheetId: string, code: string): Promise<AccessCodeEntry | null> {
  await ensureSheetExists(accessToken, SHEETS.accessCodes, ACCESS_CODE_COLUMNS, spreadsheetId);
  const rows = await getSheetData(accessToken, SHEETS.accessCodes, spreadsheetId);
  if (rows.length <= 1) return null;
  const headers = rows[0];
  const codeIndex = idx(headers, 'code');
  const activeIndex = idx(headers, 'active');
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (
      row[codeIndex] === code &&
      (row[activeIndex] === 'true' || row[activeIndex] === 'TRUE')
    ) {
      return rowToObject(row, headers) as AccessCodeEntry;
    }
  }
  return null;
}

// Validate user session from header
async function validateSession(
  sessionHeader: string | null, 
  accessToken: string, 
  spreadsheetId: string
): Promise<AppUser | null> {
  if (!sessionHeader) return null;
  
  try {
    const decodeBase64UrlUtf8 = (input: string): string => {
      const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };

    // Client sends base64url(JSON) to avoid non-latin characters in headers.
    const raw = sessionHeader.trim();
    const json = raw.startsWith('{') ? raw : decodeBase64UrlUtf8(raw);

    const session: UserSession = JSON.parse(json);
    if (!session.user_id) return null;
    
    // Verify user exists in Users sheet (whitelist check)
    await ensureSheetExists(accessToken, SHEETS.users, USER_COLUMNS, spreadsheetId);
    const rows = await getSheetData(accessToken, SHEETS.users, spreadsheetId);
    
    if (rows.length <= 1) return null;
    
    const headers = rows[0];
    const userIdIndex = idx(headers, 'user_id');
    const activeIndex = idx(headers, 'active');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row[userIdIndex] === session.user_id && 
        (row[activeIndex] === 'true' || row[activeIndex] === 'TRUE')
      ) {
        const user = rowToObject(row, headers) as AppUser;
        // SECURITY: do not trust role from client/session; load role from separate sheet
        user.role = await getRoleForUser(accessToken, spreadsheetId, user.user_id);
        return user;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Check if action requires admin role
function requiresAdmin(action: string, entity: string): boolean {
  // Announcements: only admin can create/update/delete
  if (entity === 'announcements' && ['create', 'update', 'delete'].includes(action)) {
    return true;
  }
  // Task status change to completed requires admin
  // (checked separately in task update logic)
  return false;
}

// Check if action requires authentication
function requiresAuth(action: string, entity: string): boolean {
  // Login doesn't require auth (it's the auth endpoint)
  if (entity === 'users' && action === 'login') {
    return false;
  }
  // Init-whitelist action requires special handling (secret key instead of session)
  if (entity === 'users' && action === 'init-whitelist') {
    return false;
  }
  // Share action can use secret key OR admin session
  // (we check admin role inside the action handler)
  // All other actions require auth
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    
    const { action, entity, data, id } = await req.json();
    
    // Get session from header
    const sessionHeader = req.headers.get('X-App-Session');
    
    // Check if authentication is required
    if (requiresAuth(action, entity)) {
      const user = await validateSession(sessionHeader, accessToken, spreadsheetId);
      
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if admin is required
      if (requiresAdmin(action, entity) && user.role !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store user in request context for later use
      (req as any).user = user;
    }
    
    let result: any;
    
    switch (entity) {
      case 'users': {
        const sheetName = SHEETS.users;
        await ensureSheetExists(accessToken, sheetName, USER_COLUMNS, spreadsheetId);
        
        if (action === 'login') {
          // WHITELIST LOGIN: only pre-approved users can login by user_id
          const userId = data?.user_id?.trim();
          
          if (!userId) {
            return new Response(
              JSON.stringify({ success: false, error: 'ID пользователя не указан', code: 'MISSING_USER_ID' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          
          if (rows.length <= 1) {
            return new Response(
              JSON.stringify({ success: false, error: 'Доступ запрещён', code: 'ACCESS_DENIED' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const headers = rows[0];
          const userIdIndex = idx(headers, 'user_id');
          const activeIndex = idx(headers, 'active');
          
          let foundUser: AppUser | null = null;
          
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (
              row[userIdIndex] === userId &&
              (row[activeIndex] === 'true' || row[activeIndex] === 'TRUE')
            ) {
              foundUser = rowToObject(row, headers) as AppUser;
              break;
            }
          }
          
          // NO FALLBACK - if user not in whitelist, deny access
          if (!foundUser) {
            return new Response(
              JSON.stringify({ success: false, error: 'Доступ запрещён. Обратитесь к администратору.', code: 'ACCESS_DENIED' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // SECURITY: load role from Users sheet directly (role column)
          // Also check UserRoles sheet for overrides
          const roleFromSheet = await getRoleForUser(accessToken, spreadsheetId, foundUser.user_id);
          if (roleFromSheet) {
            foundUser.role = roleFromSheet;
          }
          
          // Log first login (only if user hasn't logged before)
          const hasLogged = await hasUserLoggedBefore(accessToken, spreadsheetId, foundUser.user_id);
          if (!hasLogged) {
            await logFirstLogin(accessToken, spreadsheetId, foundUser);
          }
          
          result = foundUser;
        } else if (action === 'init-whitelist') {
          // Initialize whitelist with predefined users
          // Requires APP_SECRET_KEY header for authorization
          const secretKey = req.headers.get('X-App-Secret-Key');
          const expectedKey = Deno.env.get('APP_SECRET_KEY');
          
          console.log('Init whitelist - received key length:', secretKey?.length, 'expected key length:', expectedKey?.length);
          console.log('Keys match:', secretKey === expectedKey);
          
          if (!expectedKey || secretKey !== expectedKey) {
            console.log('Key mismatch - received:', secretKey?.substring(0, 10) + '...', 'expected:', expectedKey?.substring(0, 10) + '...');
            return new Response(
              JSON.stringify({ success: false, error: 'Invalid secret key' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Clear existing Users sheet
          const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:clear`;
          await fetch(clearUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          
          // Write headers
          await updateRow(accessToken, sheetName, 1, USER_COLUMNS, spreadsheetId);
          
          // Predefined whitelist users
          const whitelistUsers: AppUser[] = [
            { user_id: '306664248', name: 'Александра Моисеева', role: 'admin', telegram_id: '306664248', active: true },
            { user_id: '1650315171', name: 'Арсений Пахомов', role: 'user', telegram_id: '1650315171', active: true },
            { user_id: '1078606712', name: 'Александра Моисеева (Инженер ИИ)', role: 'user', telegram_id: '1078606712', active: true },
          ];
          
          // Add each user to the sheet
          for (const user of whitelistUsers) {
            await appendRow(accessToken, sheetName, objectToRow(user, USER_COLUMNS), spreadsheetId);
          }
          
          // Setup UserRoles sheet
          await ensureSheetExists(accessToken, SHEETS.userRoles, USER_ROLE_COLUMNS, spreadsheetId);
          const clearRolesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS.userRoles}!A:Z:clear`;
          await fetch(clearRolesUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          await updateRow(accessToken, SHEETS.userRoles, 1, USER_ROLE_COLUMNS, spreadsheetId);
          
          // Add role entries
          const now = new Date().toISOString();
          for (const user of whitelistUsers) {
            const roleRow: UserRoleRow = { user_id: user.user_id, role: user.role, created_at: now };
            await appendRow(accessToken, SHEETS.userRoles, objectToRow(roleRow, USER_ROLE_COLUMNS), spreadsheetId);
          }
          
          result = { message: 'Whitelist initialized with predefined users', count: whitelistUsers.length };
        } else if (action === 'share') {
          // Share spreadsheet with an email
          // Requires EITHER APP_SECRET_KEY OR authenticated admin session
          const secretKey = req.headers.get('X-App-Secret-Key');
          const expectedKey = Deno.env.get('APP_SECRET_KEY');
          const user = (req as any).user as AppUser | undefined;
          
          const hasValidSecretKey = expectedKey && secretKey === expectedKey;
          const isAdminUser = user?.role === 'admin';
          
          if (!hasValidSecretKey && !isAdminUser) {
            return new Response(
              JSON.stringify({ success: false, error: 'Admin access or secret key required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const email = data?.email?.trim();
          const role = data?.role || 'writer'; // writer or reader
          
          if (!email) {
            return new Response(
              JSON.stringify({ success: false, error: 'Email is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Use Google Drive API to share the spreadsheet
          const shareUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`;
          const shareResponse = await fetch(shareUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'user',
              role: role,
              emailAddress: email,
            }),
          });
          
          if (!shareResponse.ok) {
            const error = await shareResponse.json();
            console.error('Share error:', error);
            throw new Error(`Failed to share: ${error.error?.message || 'Unknown error'}`);
          }
          
          result = { message: `Spreadsheet shared with ${email} as ${role}` };
        }
        break;
      }
      
      case 'admin': {
        // Admin-only endpoints
        const user = (req as any).user as AppUser;
        
        if (action === 'getSpreadsheetUrl') {
          // Return the spreadsheet URL for admin users
          if (user?.role !== 'admin') {
            return new Response(
              JSON.stringify({ success: false, error: 'Admin access required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          result = {
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
            spreadsheetId: spreadsheetId,
          };
        }
        break;
      }
      
      case 'tasks': {
        const sheetName = SHEETS.tasks;
        const user = (req as any).user as AppUser;
        
        // Ensure Tasks sheet exists with proper headers
        await ensureSheetExists(accessToken, sheetName, TASK_COLUMNS, spreadsheetId);
        
        if (action === 'list') {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length <= 1) {
            // Only header row or empty
            result = [];
          } else {
            const headers = rows[0];
            result = rows.slice(1).map(row => rowToObject(row, headers));
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          
          // Validate and normalize importance
          const validImportance = ['critical', 'important', 'can_wait'];
          let importance = data.importance;
          if (importance && !validImportance.includes(importance)) {
            console.log(`Invalid importance value "${importance}", defaulting to can_wait`);
            importance = 'can_wait';
          }
          // Default to can_wait if not provided
          if (!importance) {
            importance = 'can_wait';
          }
          
          // SECURITY: Author is set from session, not from client data
          // Remove deprecated fields from data
          const { effect_type: _, digitization_section: __, ...cleanData } = data;
          const newTask = {
            ...cleanData,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            status: data.status || 'ideas',
            priority: data.priority || 'medium',
            task_type: data.task_type || 'idea',
            importance: importance,
            department: data.department || 'digitization_it', // Default department
            task_scope: data.task_scope || 'digitization', // Default scope
            due_date: data.due_date || null,
            reminder_sent: data.reminder_sent === true ? 'true' : 'false',
            effect_type: null, // DEPRECATED - always null for new tasks
            digitization_section: null, // DEPRECATED - always null for new tasks
            author: user.name, // Force author from session
          };
          const row = objectToRow(newTask, TASK_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newTask;
        } else if (action === 'update' && id) {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Task not found');
          
          const existingTask = rowToObject(rows[rowIndex], headers);
          
          // SECURITY: Only admin can change status to completed
          if (data.status === 'completed' && existingTask.status !== 'completed' && user.role !== 'admin') {
            return new Response(
              JSON.stringify({ success: false, error: 'Только администратор может отмечать задачи как завершённые' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // SECURITY: Only admin can update tasks (except possibly some fields in future)
          if (user.role !== 'admin') {
            return new Response(
              JSON.stringify({ success: false, error: 'Только администратор может редактировать задачи' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // SECURITY: Ignore author field from client
          // Also ignore deprecated fields
          const { author: _author, effect_type: _effect, digitization_section: _section, ...safeData } = data;
          
          // Validate and normalize importance if being updated
          if (safeData.importance !== undefined) {
            const validImportance = ['critical', 'important', 'can_wait'];
            if (safeData.importance && !validImportance.includes(safeData.importance)) {
              console.log(`Invalid importance value "${safeData.importance}" in update, defaulting to can_wait`);
              safeData.importance = 'can_wait';
            }
          }
          
          const updatedTask = {
            ...existingTask,
            ...safeData,
            updated_at: new Date().toISOString(),
          };
          const row = objectToRow(updatedTask, TASK_COLUMNS);
          await updateRow(accessToken, sheetName, rowIndex + 1, row, spreadsheetId);
          result = updatedTask;
        } else if (action === 'delete' && id) {
          // Only admin can delete
          if (user.role !== 'admin') {
            return new Response(
              JSON.stringify({ success: false, error: 'Только администратор может удалять задачи' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Task not found');
          
          await deleteRow(accessToken, sheetName, rowIndex + 1, spreadsheetId);
          result = { deleted: true };
        }
        break;
      }
      
      case 'announcements': {
        const sheetName = SHEETS.announcements;
        const user = (req as any).user as AppUser;
        
        if (action === 'list') {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            result = rows.slice(1).map(row => {
              const item = rowToObject(row, headers);
              if (item.related_task_ids && typeof item.related_task_ids === 'string') {
                try {
                  item.related_task_ids = JSON.parse(item.related_task_ids);
                } catch {
                  item.related_task_ids = [];
                }
              }
              return item;
            });
          }
        } else if (action === 'create') {
          // Admin check already done above
          const now = new Date().toISOString();
          const newItem = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            published_at: data.published_at || now,
            target_audience: data.target_audience || 'all',
          };
          const row = objectToRow(newItem, ANNOUNCEMENT_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newItem;
        } else if (action === 'update' && id) {
          // Admin check already done above
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Announcement not found');
          
          const existingItem = rowToObject(rows[rowIndex], headers);
          const updatedItem = {
            ...existingItem,
            ...data,
            updated_at: new Date().toISOString(),
          };
          const row = objectToRow(updatedItem, ANNOUNCEMENT_COLUMNS);
          await updateRow(accessToken, sheetName, rowIndex + 1, row, spreadsheetId);
          result = updatedItem;
        } else if (action === 'delete' && id) {
          // Admin check already done above
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Announcement not found');
          
          await deleteRow(accessToken, sheetName, rowIndex + 1, spreadsheetId);
          result = { deleted: true };
        }
        break;
      }
      
      case 'comments': {
        const sheetName = SHEETS.comments;
        const user = (req as any).user as AppUser;
        
        if (action === 'list') {
          const taskId = data?.task_id;
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            const taskIdIndex = headers.indexOf('task_id');
            result = rows.slice(1)
              .map(row => rowToObject(row, headers))
              .filter(comment => !taskId || comment.task_id === taskId);
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          // SECURITY: Author is set from session
          const newComment = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            author: user.name, // Force author from session
          };
          const row = objectToRow(newComment, COMMENT_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newComment;
        }
        break;
      }
      
      case 'readStatus': {
        const sheetName = SHEETS.readStatus;
        const user = (req as any).user as AppUser;
        
        await ensureSheetExists(accessToken, sheetName, READ_STATUS_COLUMNS, spreadsheetId);
        
        if (action === 'list') {
          // Use session user_id
          const userId = user.user_id;
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length <= 1) {
            result = [];
          } else {
            const headers = rows[0];
            const userIdIndex = headers.indexOf('user_id');
            result = rows.slice(1)
              .map(row => rowToObject(row, headers))
              .filter(status => status.user_id === userId);
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          const userId = user.user_id;
          const announcementIds = data?.announcement_ids || [];
          
          if (announcementIds.length === 0) {
            result = [];
            break;
          }
          
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows.length > 0 ? rows[0] : READ_STATUS_COLUMNS;
          const userIdIndex = headers.indexOf('user_id');
          const announcementIdIndex = headers.indexOf('announcement_id');
          
          const existingReadIds = new Set<string>();
          rows.slice(1).forEach(row => {
            if (row[userIdIndex] === userId) {
              existingReadIds.add(row[announcementIdIndex]);
            }
          });
          
          const newStatuses: any[] = [];
          for (const announcementId of announcementIds) {
            if (!existingReadIds.has(announcementId)) {
              const newStatus = {
                id: crypto.randomUUID(),
                announcement_id: announcementId,
                user_id: userId,
                read_at: now,
              };
              const row = objectToRow(newStatus, READ_STATUS_COLUMNS);
              await appendRow(accessToken, sheetName, row, spreadsheetId);
              newStatuses.push(newStatus);
            }
          }
          
          result = newStatuses;
        }
        break;
      }
      
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google Sheets API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
