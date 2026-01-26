-- Create enums for task types, effects, importance, and status
CREATE TYPE public.task_type AS ENUM ('idea', 'problem');
CREATE TYPE public.task_status AS ENUM ('ideas', 'planned', 'in-progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.effect_type AS ENUM (
  'security', 
  'compliance', 
  'reduce_manual_work', 
  'process_speed', 
  'transparency', 
  'audit_prep', 
  'financial'
);
CREATE TYPE public.importance_rating AS ENUM ('critical', 'important', 'can_wait');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table for admin management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type task_type NOT NULL DEFAULT 'idea',
  status task_status NOT NULL DEFAULT 'ideas',
  priority task_priority NOT NULL DEFAULT 'medium',
  effect_type effect_type,
  importance importance_rating,
  author TEXT NOT NULL DEFAULT 'Аноним',
  owner TEXT,
  input_data_description TEXT,
  file_name TEXT,
  file_url TEXT,
  problem_description TEXT,
  linked_idea_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_problem_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  result_before TEXT,
  result_action TEXT,
  result_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_audience TEXT NOT NULL DEFAULT 'all',
  related_task_ids UUID[] DEFAULT '{}',
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digitization queue (read-only list of future plans)
CREATE TABLE public.digitization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Not automating list (processes we consciously don't automate)
CREATE TABLE public.not_automating (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Experiments / hypotheses
CREATE TABLE public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comments on tasks
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  author TEXT NOT NULL DEFAULT 'Аноним',
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digitization_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.not_automating ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_digitization_queue_updated_at
  BEFORE UPDATE ON public.digitization_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_not_automating_updated_at
  BEFORE UPDATE ON public.not_automating
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for tasks (public read, public insert for ideas/problems, admin update)
CREATE POLICY "Tasks are viewable by everyone" 
  ON public.tasks FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create ideas and problems" 
  ON public.tasks FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Only admins can update tasks" 
  ON public.tasks FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Only admins can delete tasks" 
  ON public.tasks FOR DELETE 
  USING (public.is_admin());

-- RLS Policies for announcements (public read, admin write)
CREATE POLICY "Announcements are viewable by everyone" 
  ON public.announcements FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can create announcements" 
  ON public.announcements FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update announcements" 
  ON public.announcements FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Only admins can delete announcements" 
  ON public.announcements FOR DELETE 
  USING (public.is_admin());

-- RLS Policies for digitization_queue (public read, admin write)
CREATE POLICY "Digitization queue is viewable by everyone" 
  ON public.digitization_queue FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage digitization queue" 
  ON public.digitization_queue FOR ALL 
  USING (public.is_admin());

-- RLS Policies for not_automating (public read, admin write)
CREATE POLICY "Not automating list is viewable by everyone" 
  ON public.not_automating FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage not automating list" 
  ON public.not_automating FOR ALL 
  USING (public.is_admin());

-- RLS Policies for experiments (public read, admin write)
CREATE POLICY "Experiments are viewable by everyone" 
  ON public.experiments FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage experiments" 
  ON public.experiments FOR ALL 
  USING (public.is_admin());

-- RLS Policies for comments (public read and write)
CREATE POLICY "Comments are viewable by everyone" 
  ON public.task_comments FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can add comments" 
  ON public.task_comments FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for user_roles (admin only)
CREATE POLICY "Only admins can view roles" 
  ON public.user_roles FOR SELECT 
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Only admins can manage roles" 
  ON public.user_roles FOR ALL 
  USING (public.is_admin());