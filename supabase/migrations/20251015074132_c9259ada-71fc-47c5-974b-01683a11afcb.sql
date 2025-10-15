-- Add departments array field to ideas table
ALTER TABLE public.ideas 
ADD COLUMN departments TEXT[] DEFAULT ARRAY[]::TEXT[];