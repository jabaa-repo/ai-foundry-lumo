-- Create function to generate idea ID in format IDEA-DDMMYYYY-XXX
CREATE OR REPLACE FUNCTION public.generate_idea_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date_part TEXT;
  next_number INTEGER;
  new_id TEXT;
BEGIN
  -- Format: IDEA-DDMMYYYY-XXX
  date_part := TO_CHAR(CURRENT_DATE, 'DDMMYYYY');
  
  -- Get the next incremental number for this date
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(idea_id, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.ideas
  WHERE idea_id LIKE 'IDEA-' || date_part || '-%';
  
  new_id := 'IDEA-' || date_part || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger to auto-generate idea_id on insert
CREATE OR REPLACE FUNCTION public.handle_new_idea()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.idea_id IS NULL THEN
    NEW.idea_id := generate_idea_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS set_idea_id ON public.ideas;
CREATE TRIGGER set_idea_id
  BEFORE INSERT ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_idea();