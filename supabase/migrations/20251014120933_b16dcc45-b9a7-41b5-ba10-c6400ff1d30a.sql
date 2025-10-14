-- Add missing columns to ideas table
ALTER TABLE public.ideas 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS idea_id text,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Update existing ideas to have owner_id from user_id if not set
UPDATE public.ideas 
SET owner_id = user_id 
WHERE owner_id IS NULL;

-- Create index on category for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_category ON public.ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_owner_id ON public.ideas(owner_id);