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
  access_code: string;
  active: boolean;
  created_at: string;
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
  access_code: string;
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
const TASK_COLUMNS = [
  'id', 'title', 'summary', 'description', 'task_type', 'status', 'priority',
  'effect_type', 'importance', 'author', 'owner', 'url', 'input_data_description',
  'file_name', 'file_url', 'problem_description', 'linked_idea_id', 'linked_problem_id',
  'result_before', 'result_action', 'result_after', 'execution_log', 'created_at', 'updated_at'
];

const ANNOUNCEMENT_COLUMNS = [
  'id', 'title', 'description', 'published_at', 'target_audience', 'document_url',
  'related_task_ids', 'created_at', 'updated_at'
];

const COMMENT_COLUMNS = ['id', 'task_id', 'author', 'text', 'created_at'];
const READ_STATUS_COLUMNS = ['id', 'announcement_id', 'user_id', 'read_at'];
const USER_COLUMNS = ['user_id', 'name', 'role', 'access_code', 'active', 'created_at'];
const USER_ROLE_COLUMNS = ['user_id', 'role', 'created_at'];
const ACCESS_CODE_COLUMNS = ['code', 'role', 'active', 'created_at'];

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
    // Convert 'true'/'false' strings to booleans for 'active' field
    if (header === 'active') {
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
    const session: UserSession = JSON.parse(sessionHeader);
    if (!session.user_id || !session.access_code) return null;
    
    // Verify user exists in Users sheet
    await ensureSheetExists(accessToken, SHEETS.users, USER_COLUMNS, spreadsheetId);
    const rows = await getSheetData(accessToken, SHEETS.users, spreadsheetId);
    
    if (rows.length <= 1) return null;
    
    const headers = rows[0];
    const userIdIndex = idx(headers, 'user_id');
    const accessCodeIndex = idx(headers, 'access_code');
    const activeIndex = idx(headers, 'active');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row[userIdIndex] === session.user_id && 
        row[accessCodeIndex] === session.access_code &&
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
  // Seed action requires special handling (secret key instead of session)
  if (entity === 'users' && action === 'seed') {
    return false;
  }
  // Reset action requires special handling (secret key instead of session)
  if (entity === 'users' && action === 'reset') {
    return false;
  }
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
          // Handle login: find user by access_code
          const accessCode = data?.access_code?.trim();
          const providedName = data?.name?.trim();
          
          if (!accessCode) {
            return new Response(
              JSON.stringify({ success: false, error: 'Код доступа не указан' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          
          if (rows.length <= 1) {
            return new Response(
              JSON.stringify({ success: false, error: 'Код не подошёл. Проверьте и попробуйте снова.' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const headers = rows[0];
          const accessCodeIndex = idx(headers, 'access_code');
          const activeIndex = idx(headers, 'active');
          const userIdIndex = idx(headers, 'user_id');
          const nameIndex = idx(headers, 'name');
          
          let foundUser: AppUser | null = null;
          let foundRowIndex = -1;
          
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (
              row[accessCodeIndex] === accessCode &&
              (row[activeIndex] === 'true' || row[activeIndex] === 'TRUE')
            ) {
              foundUser = rowToObject(row, headers) as AppUser;
              foundRowIndex = i;
              break;
            }
          }

          // If code not found in Users, allow "team code" from AccessCodes sheet
          if (!foundUser) {
            const entry = await getAccessCodeEntry(accessToken, spreadsheetId, accessCode);
            if (!entry) {
              return new Response(
                JSON.stringify({ success: false, error: 'Код не подошёл. Проверьте и попробуйте снова.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            if (!providedName) {
              return new Response(
                JSON.stringify({ success: false, error: 'Введите ваше имя' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            // Create a new user record for this name under the shared code
            const now = new Date().toISOString();
            const newUser: AppUser = {
              user_id: crypto.randomUUID(),
              name: providedName,
              role: 'user',
              access_code: accessCode,
              active: true,
              created_at: now,
            };

            await appendRow(accessToken, sheetName, objectToRow(newUser, USER_COLUMNS), spreadsheetId);

            // Store role separately (authoritative)
            await ensureSheetExists(accessToken, SHEETS.userRoles, USER_ROLE_COLUMNS, spreadsheetId);
            const roleRow: UserRoleRow = {
              user_id: newUser.user_id,
              role: entry.role || 'user',
              created_at: now,
            };
            await appendRow(accessToken, SHEETS.userRoles, objectToRow(roleRow, USER_ROLE_COLUMNS), spreadsheetId);

            newUser.role = roleRow.role;
            result = newUser;
            break;
          }
          
          // If user provided a name and it's different, update it
          if (providedName && providedName !== foundUser.name) {
            const updatedUser = { ...foundUser, name: providedName };
            const row = objectToRow(updatedUser, USER_COLUMNS);
            await updateRow(accessToken, sheetName, foundRowIndex + 1, row, spreadsheetId);
            foundUser.name = providedName;
          }
          
          // Generate user_id if not exists
          if (!foundUser.user_id) {
            foundUser.user_id = crypto.randomUUID();
            const row = objectToRow(foundUser, USER_COLUMNS);
            await updateRow(accessToken, sheetName, foundRowIndex + 1, row, spreadsheetId);
          }

          // SECURITY: load role from separate sheet
          foundUser.role = await getRoleForUser(accessToken, spreadsheetId, foundUser.user_id);
          result = foundUser;
        } else if (action === 'seed') {
          // Seed action: create initial admin user
          // Requires APP_SECRET_KEY header for authorization
          const secretKey = req.headers.get('X-App-Secret-Key');
          const expectedKey = Deno.env.get('APP_SECRET_KEY');
          
          if (!expectedKey || secretKey !== expectedKey) {
            return new Response(
              JSON.stringify({ success: false, error: 'Invalid secret key' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const adminAccessCode = data?.admin_access_code;
          const adminName = data?.admin_name || 'Администратор';
          const staffAccessCode = data?.user_access_code;
          
          if (!adminAccessCode) {
            return new Response(
              JSON.stringify({ success: false, error: 'Admin access code required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Check if admin user already exists (authoritative: UserRoles)
          await ensureSheetExists(accessToken, SHEETS.userRoles, USER_ROLE_COLUMNS, spreadsheetId);
          const roleRows = await getSheetData(accessToken, SHEETS.userRoles, spreadsheetId);
          let adminExists = false;
          if (roleRows.length > 1) {
            const roleHeaders = roleRows[0];
            const roleIndex = idx(roleHeaders, 'role');
            for (let i = 1; i < roleRows.length; i++) {
              if (roleRows[i][roleIndex] === 'admin') {
                adminExists = true;
                break;
              }
            }
          }
          
          if (adminExists) {
            return new Response(
              JSON.stringify({ success: false, error: 'Admin user already exists' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Create admin user
          const now = new Date().toISOString();
          const adminUser = {
            user_id: crypto.randomUUID(),
            name: adminName,
            role: 'admin' as const,
            access_code: adminAccessCode,
            active: true,
            created_at: now,
          };
          
          const row = objectToRow(adminUser, USER_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);

          // Authoritative role row
          const adminRoleRow: UserRoleRow = { user_id: adminUser.user_id, role: 'admin', created_at: now };
          await appendRow(accessToken, SHEETS.userRoles, objectToRow(adminRoleRow, USER_ROLE_COLUMNS), spreadsheetId);

          // Optional: seed shared staff code
          if (staffAccessCode) {
            await ensureSheetExists(accessToken, SHEETS.accessCodes, ACCESS_CODE_COLUMNS, spreadsheetId);
            const codes = await getSheetData(accessToken, SHEETS.accessCodes, spreadsheetId);
            const codeHeaders = codes.length > 0 ? codes[0] : ACCESS_CODE_COLUMNS;
            const codeIndex = idx(codeHeaders, 'code');
            const already = codes.slice(1).some(r => r[codeIndex] === staffAccessCode);
            if (!already) {
              const entry: AccessCodeEntry = { code: staffAccessCode, role: 'user', active: true, created_at: now };
              await appendRow(accessToken, SHEETS.accessCodes, objectToRow(entry, ACCESS_CODE_COLUMNS), spreadsheetId);
            }
          }
          
          result = { message: 'Admin user created successfully', user_id: adminUser.user_id };
        } else if (action === 'reset') {
          // Reset action: clear and recreate Users sheet (requires APP_SECRET_KEY)
          const secretKey = req.headers.get('X-App-Secret-Key');
          const expectedKey = Deno.env.get('APP_SECRET_KEY');
          
          if (!expectedKey || secretKey !== expectedKey) {
            return new Response(
              JSON.stringify({ success: false, error: 'Invalid secret key' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Clear Users sheet
          const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:clear`;
          await fetch(clearUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          
          // Write headers
          await updateRow(accessToken, sheetName, 1, USER_COLUMNS, spreadsheetId);
          
          // Clear UserRoles sheet
          await ensureSheetExists(accessToken, SHEETS.userRoles, USER_ROLE_COLUMNS, spreadsheetId);
          const clearRolesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS.userRoles}!A:Z:clear`;
          await fetch(clearRolesUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          await updateRow(accessToken, SHEETS.userRoles, 1, USER_ROLE_COLUMNS, spreadsheetId);
          
          // Clear AccessCodes sheet
          await ensureSheetExists(accessToken, SHEETS.accessCodes, ACCESS_CODE_COLUMNS, spreadsheetId);
          const clearCodesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS.accessCodes}!A:Z:clear`;
          await fetch(clearCodesUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          await updateRow(accessToken, SHEETS.accessCodes, 1, ACCESS_CODE_COLUMNS, spreadsheetId);
          
          // Now create admin
          const adminAccessCode = data?.admin_access_code;
          const adminName = data?.admin_name || 'Администратор';
          const staffAccessCode = data?.user_access_code;
          
          if (!adminAccessCode) {
            return new Response(
              JSON.stringify({ success: false, error: 'Admin access code required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const now = new Date().toISOString();
          const adminUser = {
            user_id: crypto.randomUUID(),
            name: adminName,
            role: 'admin' as const,
            access_code: adminAccessCode,
            active: true,
            created_at: now,
          };
          
          await appendRow(accessToken, sheetName, objectToRow(adminUser, USER_COLUMNS), spreadsheetId);
          
          // Authoritative role row
          const adminRoleRow: UserRoleRow = { user_id: adminUser.user_id, role: 'admin', created_at: now };
          await appendRow(accessToken, SHEETS.userRoles, objectToRow(adminRoleRow, USER_ROLE_COLUMNS), spreadsheetId);
          
          // Create staff code
          if (staffAccessCode) {
            const entry: AccessCodeEntry = { code: staffAccessCode, role: 'user', active: true, created_at: now };
            await appendRow(accessToken, SHEETS.accessCodes, objectToRow(entry, ACCESS_CODE_COLUMNS), spreadsheetId);
          }
          
          result = { message: 'Users reset and admin created successfully', user_id: adminUser.user_id };
        }
        break;
      }
      
      case 'tasks': {
        const sheetName = SHEETS.tasks;
        const user = (req as any).user as AppUser;
        
        if (action === 'list') {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            result = rows.slice(1).map(row => rowToObject(row, headers));
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          // SECURITY: Author is set from session, not from client data
          const newTask = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            status: data.status || 'ideas',
            priority: data.priority || 'medium',
            task_type: data.task_type || 'idea',
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
          const { author: _, ...safeData } = data;
          
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
