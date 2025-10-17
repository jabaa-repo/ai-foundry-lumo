-- Fix security warning: Add search_path to generate_idea_id function
CREATE OR REPLACE FUNCTION public.generate_idea_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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