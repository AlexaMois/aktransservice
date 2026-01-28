import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskWithReminder {
  id: string;
  title: string;
  due_date: string;
  owner: string | null;
}

interface TelegramLink {
  user_id: string;
  telegram_user_id: string;
}

/**
 * Format date for Telegram message
 */
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

/**
 * Send Telegram message
 */
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find tasks that need reminders:
    // - due_date <= now + 10 minutes
    // - reminder_sent = false
    // - status != 'completed'
    // - has owner
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    const { data: tasksToRemind, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, due_date, owner')
      .eq('reminder_sent', false)
      .neq('status', 'completed')
      .not('owner', 'is', null)
      .not('due_date', 'is', null)
      .lte('due_date', tenMinutesFromNow.toISOString());

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    if (!tasksToRemind || tasksToRemind.length === 0) {
      console.log('No tasks need reminders');
      return new Response(
        JSON.stringify({ success: true, reminded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tasksToRemind.length} tasks to remind`);

    // Get unique owner IDs
    const ownerIds = [...new Set(tasksToRemind.map(t => t.owner).filter(Boolean))];

    // Fetch Telegram links for these owners
    const { data: telegramLinks, error: telegramError } = await supabase
      .from('user_telegram')
      .select('user_id, telegram_user_id')
      .in('user_id', ownerIds);

    if (telegramError) {
      console.error('Error fetching telegram links:', telegramError);
    }

    // Create lookup map
    const telegramMap = new Map<string, string>();
    (telegramLinks || []).forEach((link: TelegramLink) => {
      telegramMap.set(link.user_id, link.telegram_user_id);
    });

    let remindedCount = 0;
    const tasksToMarkReminded: string[] = [];

    // Send reminders
    for (const task of tasksToRemind as TaskWithReminder[]) {
      if (!task.owner) continue;

      const telegramUserId = telegramMap.get(task.owner);
      
      if (!telegramUserId) {
        console.log(`No Telegram ID for owner ${task.owner}, skipping task ${task.id}`);
        // Still mark as reminded to avoid infinite retries
        tasksToMarkReminded.push(task.id);
        continue;
      }

      const message = `🔔 <b>Напоминание</b>\n\n📋 Задача: ${task.title}\n⏰ Дедлайн: ${formatDueDate(task.due_date)}`;

      const sent = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, telegramUserId, message);
      
      if (sent) {
        tasksToMarkReminded.push(task.id);
        remindedCount++;
        console.log(`Sent reminder for task ${task.id} to ${telegramUserId}`);
      }
    }

    // Mark tasks as reminded
    if (tasksToMarkReminded.length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ reminder_sent: true })
        .in('id', tasksToMarkReminded);

      if (updateError) {
        console.error('Error marking tasks as reminded:', updateError);
      }
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
