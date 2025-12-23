-- Migration: Fix accept_project_client_code to prioritize projects.client_code_hash
-- This ensures new projects created with client codes (stored in projects.client_code_hash)
-- are found before checking the client_codes table (old multi-code system)

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
  v_client_code RECORD;
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

  -- PRIORITY 1: Check projects.client_code_hash first (new projects created directly)
  SELECT id INTO v_project_id
  FROM projects
  WHERE client_code_hash = v_code_hash
    AND COALESCE(client_code_active, TRUE) = TRUE
  LIMIT 1;

  -- PRIORITY 2: Check client_codes table (old multi-code system)
  IF v_project_id IS NULL THEN
    SELECT project_id INTO v_project_id
    FROM client_codes
    WHERE code_hash = v_code_hash
      AND is_active = TRUE
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- PRIORITY 3: Backward compatibility - check plaintext code
  IF v_project_id IS NULL THEN
    SELECT id INTO v_project_id
    FROM projects
    WHERE client_code = p_code
    LIMIT 1;

    -- Auto-migrate: If project exists but doesn't have hash set, set it now
    IF v_project_id IS NOT NULL THEN
      UPDATE projects
      SET 
        client_code_hash = v_code_hash,
        client_code_active = COALESCE(client_code_active, TRUE),
        client_code_created_at = COALESCE(client_code_created_at, NOW())
      WHERE id = v_project_id
        AND client_code_hash IS NULL;
    END IF;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid client code';
  END IF;

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

-- Ensure execute permissions are granted
GRANT EXECUTE ON FUNCTION public.accept_project_client_code(TEXT) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.accept_project_client_code(TEXT) IS 
  'Allows a user to join a project using a client code. Creates membership if not exists. Idempotent. 
   Checks projects.client_code_hash first (new projects), then client_codes table (old system), then plaintext (backward compatibility).';
