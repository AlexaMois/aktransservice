/**
 * Task Reminder Cron - reads tasks from Google Sheets and sends Telegram reminders
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Sheets configuration
const getSpreadsheetId = () => {
  const rawValue = Deno.env.get('GOOGLE_SHEETS_ID') || '';
  const urlMatch = rawValue.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  return rawValue;
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
  owner: string | null;
  reminder_sent: boolean;
  status: string;
}

interface TelegramUser {
  user_id: string;
  telegram_id: string;
}

async function getAccessToken(serviceAccountKey: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
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

async function getSheetData(accessToken: string, sheetName: string, spreadsheetId: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:AZ`;
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

async function updateCell(
  accessToken: string, 
  sheetName: string, 
  rowIndex: number, 
  colIndex: number, 
  value: string, 
  spreadsheetId: string
): Promise<void> {
  // Convert column index to letter (A, B, C, etc.)
  const colLetter = String.fromCharCode(65 + colIndex);
  const range = `${sheetName}!${colLetter}${rowIndex}`;
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update cell: ${error.error?.message}`);
  }
}

function rowToObject(row: string[], headers: string[]): Record<string, string | boolean | null> {
  const obj: Record<string, string | boolean | null> = {};
  headers.forEach((header, index) => {
    const value = row[index] || null;
    if (header === 'reminder_sent') {
      obj[header] = value === 'true' || value === 'TRUE';
    } else {
      obj[header] = value === '' ? null : value;
    }
  });
  return obj;
}

function formatDueDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    });
  } catch {
    return isoDate;
  }
}

async function sendTelegramMessage(
  botToken: string, 
  chatId: string, 
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Telegram API error for ${chatId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to send Telegram message to ${chatId}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
    }

    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const serviceAccountKey: ServiceAccountKey = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
    const accessToken = await getAccessToken(serviceAccountKey);

    // Get tasks from Tasks sheet
    const tasksRows = await getSheetData(accessToken, 'Tasks', spreadsheetId);
    if (tasksRows.length <= 1) {
      console.log('No tasks found');
      return new Response(
        JSON.stringify({ success: true, reminded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskHeaders = tasksRows[0];
    const idIndex = taskHeaders.indexOf('id');
    const titleIndex = taskHeaders.indexOf('title');
    const dueDateIndex = taskHeaders.indexOf('due_date');
    const ownerIndex = taskHeaders.indexOf('owner');
    const reminderSentIndex = taskHeaders.indexOf('reminder_sent');
    const statusIndex = taskHeaders.indexOf('status');

    // Get users from Users sheet for Telegram IDs
    const usersRows = await getSheetData(accessToken, 'Users', spreadsheetId);
    const userHeaders = usersRows[0] || [];
    const userIdIndex = userHeaders.indexOf('user_id');
    const telegramIdIndex = userHeaders.indexOf('telegram_id');

    // Build user -> telegram_id map
    const telegramMap = new Map<string, string>();
    for (let i = 1; i < usersRows.length; i++) {
      const row = usersRows[i];
      const userId = row[userIdIndex];
      const telegramId = row[telegramIdIndex];
      if (userId && telegramId) {
        telegramMap.set(userId, telegramId);
      }
    }

    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    let remindedCount = 0;
    const tasksToMarkReminded: { rowIndex: number; taskId: string }[] = [];

    // Find tasks that need reminders
    for (let i = 1; i < tasksRows.length; i++) {
      const row = tasksRows[i];
      const task: TaskRow = {
        id: row[idIndex] || '',
        title: row[titleIndex] || '',
        due_date: row[dueDateIndex] || '',
        owner: row[ownerIndex] || null,
        reminder_sent: row[reminderSentIndex] === 'true' || row[reminderSentIndex] === 'TRUE',
        status: row[statusIndex] || '',
      };

      // Skip if already reminded, no owner, no due date, or completed
      if (task.reminder_sent) continue;
      if (!task.owner) continue;
      if (!task.due_date) continue;
      if (task.status === 'completed') continue;

      // Check if due date is within 10 minutes
      const dueDate = new Date(task.due_date);
      if (isNaN(dueDate.getTime())) continue;
      if (dueDate > tenMinutesFromNow) continue;

      // Get Telegram ID for owner
      const telegramUserId = telegramMap.get(task.owner);
      
      if (!telegramUserId) {
        console.log(`No Telegram ID for owner ${task.owner}, marking as reminded`);
        tasksToMarkReminded.push({ rowIndex: i + 1, taskId: task.id });
        continue;
      }

      const message = `🔔 <b>Напоминание</b>\n\n📋 Задача: ${task.title}\n⏰ Дедлайн: ${formatDueDate(task.due_date)}`;

      const sent = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, telegramUserId, message);
      
      if (sent) {
        tasksToMarkReminded.push({ rowIndex: i + 1, taskId: task.id });
        remindedCount++;
        console.log(`Sent reminder for task ${task.id} to ${telegramUserId}`);
      }
    }

    // Mark tasks as reminded in Google Sheets
    for (const { rowIndex } of tasksToMarkReminded) {
      await updateCell(accessToken, 'Tasks', rowIndex, reminderSentIndex, 'true', spreadsheetId);
    }

    console.log(`Reminder cron completed: ${remindedCount} reminders sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminded: remindedCount,
        processed: tasksToMarkReminded.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Reminder cron error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
