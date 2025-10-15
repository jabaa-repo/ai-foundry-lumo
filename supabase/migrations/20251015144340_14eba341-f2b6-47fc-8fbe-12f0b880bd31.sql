-- Create archived_ideas table
CREATE TABLE public.archived_ideas (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  possible_outcome text NOT NULL,
  departments text[] DEFAULT ARRAY[]::text[],
  category text,
  idea_id text,
  owner_id uuid,
  accountable_id uuid,
  responsible_id uuid,
  consulted_ids uuid[] DEFAULT '{}'::uuid[],
  informed_ids uuid[] DEFAULT '{}'::uuid[],
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.archived_ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all archived ideas"
ON public.archived_ideas
FOR SELECT
USING (true);

CREATE POLICY "Users can create archived ideas"
ON public.archived_ideas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archived ideas"
ON public.archived_ideas
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_archived_ideas_updated_at
BEFORE UPDATE ON public.archived_ideas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();