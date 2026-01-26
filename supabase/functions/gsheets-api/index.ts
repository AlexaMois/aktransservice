import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets configuration - use environment variable
const getSpreadsheetId = () => {
  const rawValue = Deno.env.get('GOOGLE_SHEETS_ID') || '';
  
  // Extract ID from full URL if necessary
  // Format: https://docs.google.com/spreadsheets/d/{ID}/...
  const urlMatch = rawValue.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  return rawValue;
};

const SHEETS = {
  tasks: 'Tasks',
  announcements: 'Announcements',
  comments: 'Comments',
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
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

// Task columns mapping
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

function rowToTask(row: string[], headers: string[]): Record<string, any> {
  const task: Record<string, any> = {};
  headers.forEach((header, index) => {
    const value = row[index] || null;
    task[header] = value === '' ? null : value;
  });
  return task;
}

function taskToRow(task: Record<string, any>, columns: string[]): string[] {
  return columns.map(col => {
    const value = task[col];
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return JSON.stringify(value);
    return String(value);
  });
}

async function getSheetData(accessToken: string, sheetName: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z`;
  console.log('Fetching sheet data from:', url);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  const responseText = await response.text();
  console.log('Sheet API response status:', response.status);
  
  if (!response.ok) {
    console.error('Sheet API error response:', responseText);
    throw new Error(`Failed to get sheet data: ${response.status} - ${responseText.substring(0, 200)}`);
  }
  
  try {
    const data = JSON.parse(responseText);
    return data.values || [];
  } catch (e) {
    console.error('Failed to parse JSON:', responseText.substring(0, 200));
    throw e;
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
  // Get sheet ID first
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const serviceAccountKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyRaw) {
      throw new Error('Google integration not configured');
    }
    
    const spreadsheetId = getSpreadsheetId();
    console.log('Using spreadsheet ID:', spreadsheetId);
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_ID not configured');
    }
    
    const serviceAccountKey: ServiceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);
    
    const { action, entity, data, id } = await req.json();
    
    let result: any;
    
    switch (entity) {
      case 'tasks': {
        const sheetName = SHEETS.tasks;
        
        if (action === 'list') {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            result = rows.slice(1).map(row => rowToTask(row, headers));
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          const newTask = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            status: data.status || 'ideas',
            priority: data.priority || 'medium',
            task_type: data.task_type || 'idea',
          };
          const row = taskToRow(newTask, TASK_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newTask;
        } else if (action === 'update' && id) {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Task not found');
          
          const existingTask = rowToTask(rows[rowIndex], headers);
          const updatedTask = {
            ...existingTask,
            ...data,
            updated_at: new Date().toISOString(),
          };
          const row = taskToRow(updatedTask, TASK_COLUMNS);
          await updateRow(accessToken, sheetName, rowIndex + 1, row, spreadsheetId);
          result = updatedTask;
        } else if (action === 'delete' && id) {
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
        
        if (action === 'list') {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            result = rows.slice(1).map(row => {
              const item = rowToTask(row, headers);
              // Parse related_task_ids from JSON
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
          const now = new Date().toISOString();
          const newItem = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            updated_at: now,
            published_at: data.published_at || now,
            target_audience: data.target_audience || 'all',
          };
          const row = taskToRow(newItem, ANNOUNCEMENT_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newItem;
        } else if (action === 'update' && id) {
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          const headers = rows[0];
          const idIndex = headers.indexOf('id');
          const rowIndex = rows.findIndex((row, i) => i > 0 && row[idIndex] === id);
          
          if (rowIndex === -1) throw new Error('Announcement not found');
          
          const existingItem = rowToTask(rows[rowIndex], headers);
          const updatedItem = {
            ...existingItem,
            ...data,
            updated_at: new Date().toISOString(),
          };
          const row = taskToRow(updatedItem, ANNOUNCEMENT_COLUMNS);
          await updateRow(accessToken, sheetName, rowIndex + 1, row, spreadsheetId);
          result = updatedItem;
        } else if (action === 'delete' && id) {
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
        
        if (action === 'list') {
          const taskId = data?.task_id;
          const rows = await getSheetData(accessToken, sheetName, spreadsheetId);
          if (rows.length === 0) {
            result = [];
          } else {
            const headers = rows[0];
            const taskIdIndex = headers.indexOf('task_id');
            result = rows.slice(1)
              .map(row => rowToTask(row, headers))
              .filter(comment => !taskId || comment.task_id === taskId);
          }
        } else if (action === 'create') {
          const now = new Date().toISOString();
          const newComment = {
            ...data,
            id: crypto.randomUUID(),
            created_at: now,
            author: data.author || 'Аноним',
          };
          const row = taskToRow(newComment, COMMENT_COLUMNS);
          await appendRow(accessToken, sheetName, row, spreadsheetId);
          result = newComment;
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
