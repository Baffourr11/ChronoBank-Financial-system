-- Run in Supabase SQL Editor if registration fails with:
-- "Database error saving new user"

-- 1) Remove legacy password_hash (trigger insert does not set it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE public.users DROP COLUMN password_hash;
  END IF;
END $$;

-- 2) Remove stale profiles that block the same email (old JWT-era rows)
DELETE FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id);

-- 3) Sync public.users.id with auth.users when possible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'users_id_fkey not added (orphan rows may remain): %', SQLERRM;
END $$;

-- 4) Trigger: create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_preferences jsonb;
BEGIN
  v_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  v_preferences := COALESCE(
    (NEW.raw_user_meta_data->'preferences')::jsonb,
    '{"currency":"USD","timezone":"UTC","theme":"light"}'::jsonb
  );

  -- Legacy row: same email, different id
  DELETE FROM public.users
  WHERE lower(email) = lower(COALESCE(NEW.email, ''))
    AND id IS DISTINCT FROM NEW.id;

  INSERT INTO public.users (id, email, full_name, preferences)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_full_name, v_preferences)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    preferences = EXCLUDED.preferences,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5) RLS: allow users to insert their own profile row (API upsert fallback)
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6) Ensure trigger can write (Supabase)
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT INSERT, UPDATE ON public.users TO postgres, service_role;
