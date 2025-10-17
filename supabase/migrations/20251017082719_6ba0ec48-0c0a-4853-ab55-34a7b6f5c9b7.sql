-- Add accountable_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN accountable_id uuid REFERENCES auth.users(id);