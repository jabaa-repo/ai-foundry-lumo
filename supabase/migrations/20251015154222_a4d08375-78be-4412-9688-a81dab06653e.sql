-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for task file attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create table for comment file attachments
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
CREATE POLICY "Users can view all task attachments"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload task attachments"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own task attachments"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- RLS Policies for comment_attachments
CREATE POLICY "Users can view all comment attachments"
  ON public.comment_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload comment attachments"
  ON public.comment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own comment attachments"
  ON public.comment_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Storage policies for task-attachments bucket
CREATE POLICY "Users can view task attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can upload task attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);