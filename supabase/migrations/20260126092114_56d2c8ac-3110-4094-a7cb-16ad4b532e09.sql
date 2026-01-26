-- Add execution log field for tracking task progress
ALTER TABLE public.tasks 
ADD COLUMN execution_log text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.execution_log IS 'Лог хода выполнения задачи. Формат: Дата — действие — результат';