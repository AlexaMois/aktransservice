-- Add new task types to the enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'task';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'announcement';

-- Add new columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS url TEXT;

-- Update existing records: move description to summary for existing records
UPDATE public.tasks 
SET summary = CASE 
  WHEN length(description) > 200 THEN left(description, 200) || '...'
  ELSE description
END
WHERE summary IS NULL;

-- Make summary required for new records
ALTER TABLE public.tasks 
ALTER COLUMN summary SET NOT NULL,
ALTER COLUMN description DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.summary IS 'Brief 1-2 sentence description shown on card';
COMMENT ON COLUMN public.tasks.description IS 'Detailed optional description';
COMMENT ON COLUMN public.tasks.url IS 'External URL link';