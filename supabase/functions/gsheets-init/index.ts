const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// Folder ID for the spreadsheet
const PARENT_FOLDER_ID = '16zEA_4Cg7lCc873DK1G5gOdAIF5KPvlC';

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

const TASK_HEADERS = [
  'id', 'title', 'summary', 'description', 'task_type', 'status', 'priority',
  'effect_type', 'importance', 'author', 'owner', 'url', 'input_data_description',
  'file_name', 'file_url', 'problem_description', 'linked_idea_id', 'linked_problem_id',
  'result_before', 'result_action', 'result_after', 'execution_log', 'created_at', 'updated_at'
];

const ANNOUNCEMENT_HEADERS = [
  'id', 'title', 'description', 'published_at', 'target_audience', 'document_url',
  'related_task_ids', 'created_at', 'updated_at'
];

const COMMENT_HEADERS = ['id', 'task_id', 'author', 'text', 'created_at'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const serviceAccountKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyRaw) {
      throw new Error('Google integration not configured');
    }
    
    const serviceAccountKey: ServiceAccountKey = JSON.parse(serviceAccountKeyRaw);
    const accessToken = await getAccessToken(serviceAccountKey);
    
    const { existingTasks, existingAnnouncements } = await req.json();
    
    // Create new spreadsheet
    console.log('Creating spreadsheet...');
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'Цифровизация АкТрансСервис - База данных',
        },
        sheets: [
          { properties: { title: 'Tasks', index: 0 } },
          { properties: { title: 'Announcements', index: 1 } },
          { properties: { title: 'Comments', index: 2 } },
        ],
      }),
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Failed to create spreadsheet: ${error.error?.message}`);
    }
    
    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    console.log('Created spreadsheet:', spreadsheetId);
    
    // Move to folder
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${PARENT_FOLDER_ID}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    // Make spreadsheet accessible
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone',
      }),
    });
    
    // Add headers to each sheet
    const batchData = [
      { range: 'Tasks!A1:X1', values: [TASK_HEADERS] },
      { range: 'Announcements!A1:I1', values: [ANNOUNCEMENT_HEADERS] },
      { range: 'Comments!A1:E1', values: [COMMENT_HEADERS] },
    ];
    
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: batchData,
      }),
    });
    
    // Migrate existing tasks
    if (existingTasks && existingTasks.length > 0) {
      console.log(`Migrating ${existingTasks.length} tasks...`);
      const taskRows = existingTasks.map((task: any) => 
        TASK_HEADERS.map(col => {
          const value = task[col];
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) return JSON.stringify(value);
          return String(value);
        })
      );
      
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Tasks!A2:X${taskRows.length + 1}:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: taskRows }),
      });
    }
    
    // Migrate existing announcements
    if (existingAnnouncements && existingAnnouncements.length > 0) {
      console.log(`Migrating ${existingAnnouncements.length} announcements...`);
      const announcementRows = existingAnnouncements.map((item: any) => 
        ANNOUNCEMENT_HEADERS.map(col => {
          const value = item[col];
          if (value === null || value === undefined) return '';
          if (Array.isArray(value)) return JSON.stringify(value);
          return String(value);
        })
      );
      
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Announcements!A2:I${announcementRows.length + 1}:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: announcementRows }),
      });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        message: 'Spreadsheet created and data migrated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Init error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
