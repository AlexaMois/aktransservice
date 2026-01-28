-- Add 'question' to task_type enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'question';

-- Add 'review' to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'review';