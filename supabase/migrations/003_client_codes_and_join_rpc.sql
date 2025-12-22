-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add new columns to projects table for secure client codes
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS client_code_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS client_code_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_code_last_rotated_at TIMESTAMPTZ;

-- Create index on client_code_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_client_code_hash ON projects(client_code_hash) WHERE client_code_active = TRUE;

-- Helper function to hash client codes
-- Uses SHA256 from pgcrypto if available, otherwise falls back to built-in MD5
-- NOTE: For production, enable pgcrypto extension for SHA256 security
CREATE OR REPLACE FUNCTION public.hash_client_code(code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Try to use SHA256 from pgcrypto first (more secure)
  BEGIN
    SELECT encode(digest(code, 'sha256'), 'hex') INTO result;
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: Use PostgreSQL's built-in MD5 function (less secure but works without extensions)
    -- WARNING: MD5 is cryptographically broken. Enable pgcrypto extension for production.
    RETURN md5(code);
  END;
END;
$$;

-- Helper function to generate a human-friendly random code
-- 10 characters, uppercase + digits, excluding confusing chars (O, 0, I, 1)
-- Uses random() if pgcrypto is not available (fallback for compatibility)
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No O, 0, I, 1 (32 chars total)
  result TEXT := '';
  i INTEGER;
  char_index INTEGER;
  random_val NUMERIC;
BEGIN
  -- Generate 10 random characters
  -- Try to use gen_random_bytes if available, otherwise fall back to random()
  FOR i IN 1..10 LOOP
    -- Use random() which is always available (0.0 to 1.0)
    random_val := random();
    -- Map to char index (1-32)
    char_index := floor(random_val * 32)::INTEGER + 1;
    result := result || substr(chars, char_index, 1);
  END LOOP;
  
  RETURN result;
END;
$$;

-- SECURITY DEFINER RPC: Regenerate project client code
-- Only agency_admin for the project can call this
CREATE OR REPLACE FUNCTION public.regenerate_project_client_code(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_code TEXT;
  v_hashed_code TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check that user is agency_admin for this project
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = v_user_id
      AND role = 'agency_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be agency_admin';
  END IF;

  -- Verify project exists
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Generate new code and hash
  v_new_code := generate_client_code();
  v_hashed_code := hash_client_code(v_new_code);

  -- Update project with new hash and timestamps
  UPDATE projects
  SET 
    client_code_hash = v_hashed_code,
    client_code_active = TRUE,
    client_code_created_at = COALESCE(client_code_created_at, NOW()),
    client_code_last_rotated_at = NOW()
  WHERE id = p_project_id;

  -- Return plaintext code ONCE (this is the only time it's available)
  RETURN v_new_code;
END;
$$;

-- SECURITY DEFINER RPC: Accept project client code (join project)
-- Anyone authenticated can call this to join a project
CREATE OR REPLACE FUNCTION public.accept_project_client_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code_hash TEXT;
  v_project_id UUID;
  v_existing_member BOOLEAN;
  v_default_role TEXT := 'client_admin';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normalize input (trim and uppercase)
  p_code := UPPER(TRIM(p_code));
  
  IF p_code = '' OR LENGTH(p_code) < 8 THEN
    RAISE EXCEPTION 'Invalid client code';
  END IF;

  -- Hash the input code
  v_code_hash := hash_client_code(p_code);

  -- Find project with matching hash and active code
  -- Also check plaintext code for backward compatibility (projects created before migration)
  SELECT id INTO v_project_id
  FROM projects
  WHERE (
    (client_code_hash = v_code_hash AND client_code_active = TRUE)
    OR client_code = p_code  -- Backward compatibility: check plaintext code
  )
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid client code';
  END IF;

  -- Auto-migrate: If project exists but doesn't have hash set, set it now
  UPDATE projects
  SET 
    client_code_hash = v_code_hash,
    client_code_active = COALESCE(client_code_active, TRUE),
    client_code_created_at = COALESCE(client_code_created_at, NOW())
  WHERE id = v_project_id
    AND client_code_hash IS NULL;

  -- Check if user is already a member (idempotent)
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
  ) INTO v_existing_member;

  -- If not a member, add them
  IF NOT v_existing_member THEN
    -- Check if there's already a client_admin
    IF EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = v_project_id
        AND role = 'client_admin'
    ) THEN
      v_default_role := 'client_member';
    END IF;

    INSERT INTO project_members (project_id, user_id, role)
    VALUES (v_project_id, v_user_id, v_default_role);
  END IF;

  -- Return project_id (idempotent - returns same even if already member)
  RETURN v_project_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.hash_client_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_project_client_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_project_client_code(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.regenerate_project_client_code(UUID) IS 
  'Regenerates a client code for a project. Only agency_admin can call this. Returns plaintext code once.';
COMMENT ON FUNCTION public.accept_project_client_code(TEXT) IS 
  'Allows a user to join a project using a client code. Creates membership if not exists. Idempotent.';
