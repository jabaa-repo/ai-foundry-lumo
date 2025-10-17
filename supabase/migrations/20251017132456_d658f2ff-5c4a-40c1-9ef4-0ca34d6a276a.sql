
-- Add needs_password_change column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS needs_password_change boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.needs_password_change IS 'Flag to indicate if user must change password on next login';
