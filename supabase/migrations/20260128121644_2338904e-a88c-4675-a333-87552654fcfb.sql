-- Add due_date and reminder_sent fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN due_date timestamptz NULL,
ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;

-- Add telegram_user_id to store user's Telegram ID for notifications
-- This will be linked via owner field (user_id)
CREATE TABLE IF NOT EXISTS public.user_telegram (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  telegram_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_telegram
CREATE POLICY "Users can view their own telegram link"
ON public.user_telegram
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own telegram link"
ON public.user_telegram
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own telegram link"
ON public.user_telegram
FOR UPDATE
USING (true);

-- Index for faster reminder queries
CREATE INDEX idx_tasks_reminder_pending 
ON public.tasks (due_date, reminder_sent, status) 
WHERE reminder_sent = false AND status != 'completed';