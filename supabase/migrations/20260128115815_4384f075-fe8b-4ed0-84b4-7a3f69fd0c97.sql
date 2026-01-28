-- Add task_scope enum type
CREATE TYPE public.task_scope AS ENUM ('digitization', 'personal');

-- Add task_scope column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN task_scope public.task_scope NOT NULL DEFAULT 'digitization';

-- Update RLS policies to allow users to update their own personal tasks
DROP POLICY IF EXISTS "Only admins can update tasks" ON public.tasks;

CREATE POLICY "Admins can update all tasks"
ON public.tasks
FOR UPDATE
USING (is_admin());

CREATE POLICY "Users can update their own personal tasks"
ON public.tasks
FOR UPDATE
USING (
  task_scope = 'personal' 
  AND owner IS NOT NULL 
  AND owner = (current_setting('request.headers', true)::json->>'x-user-id')::text
);

-- Update delete policy similarly
DROP POLICY IF EXISTS "Only admins can delete tasks" ON public.tasks;

CREATE POLICY "Admins can delete all tasks"
ON public.tasks
FOR DELETE
USING (is_admin());

CREATE POLICY "Users can delete their own personal tasks"
ON public.tasks
FOR DELETE
USING (
  task_scope = 'personal' 
  AND owner IS NOT NULL 
  AND owner = (current_setting('request.headers', true)::json->>'x-user-id')::text
);