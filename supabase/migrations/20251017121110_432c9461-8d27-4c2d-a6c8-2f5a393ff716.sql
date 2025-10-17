-- Add email column to profiles table for easier querying
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles with emails from auth.users
-- This is a one-time update for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    INNER JOIN public.profiles p ON p.id = au.id
    WHERE p.email IS NULL
  LOOP
    UPDATE public.profiles
    SET email = user_record.email
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Update the handle_new_user trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'display_name',
    new.email
  );
  RETURN new;
END;
$$;