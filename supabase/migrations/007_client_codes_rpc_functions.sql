-- Migration: RPC functions for client_codes table operations

-- RPC: Create a new client code for a project
CREATE OR REPLACE FUNCTION public.create_project_client_code(
  p_project_id UUID,
  p_label TEXT,
  p_client_name TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_code TEXT;
  v_hashed_code TEXT;
  v_code_id UUID;
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

  -- Ensure uniqueness (shouldn't happen, but safety check)
  WHILE EXISTS (
    SELECT 1 FROM client_codes 
    WHERE project_id = p_project_id 
      AND code_hash = v_hashed_code
      AND deleted_at IS NULL
  ) LOOP
    v_new_code := generate_client_code();
    v_hashed_code := hash_client_code(v_new_code);
  END LOOP;

  -- Insert new client code
  INSERT INTO client_codes (
    project_id,
    code_hash,
    label,
    client_name,
    client_email,
    notes,
    is_active,
    created_by
  )
  VALUES (
    p_project_id,
    v_hashed_code,
    p_label,
    p_client_name,
    p_client_email,
    p_notes,
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_code_id;

  -- Return plaintext code ONCE (this is the only time it's available)
  RETURN v_new_code;
END;
$$;

-- RPC: Get all client codes for a project
CREATE OR REPLACE FUNCTION public.get_project_client_codes(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  code_hash TEXT,
  label TEXT,
  client_name TEXT,
  client_email TEXT,
  notes TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
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

  -- Return all non-deleted client codes for the project
  RETURN QUERY
  SELECT 
    cc.id,
    cc.code_hash,
    cc.label,
    cc.client_name,
    cc.client_email,
    cc.notes,
    cc.is_active,
    cc.created_at,
    cc.created_by
  FROM client_codes cc
  WHERE cc.project_id = p_project_id
    AND cc.deleted_at IS NULL
  ORDER BY cc.created_at DESC;
END;
$$;

-- RPC: Update client code details
-- NULL values are treated as "don't update", so to clear a field, pass empty string ''
CREATE OR REPLACE FUNCTION public.update_client_code_details(
  p_code_id UUID,
  p_label TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_client_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get project_id from client code
  SELECT project_id INTO v_project_id
  FROM client_codes
  WHERE id = p_code_id
    AND deleted_at IS NULL;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Client code not found';
  END IF;

  -- Check that user is agency_admin for this project
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
      AND role = 'agency_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be agency_admin';
  END IF;

  -- Update only provided fields (NULL means don't update, empty string means clear)
  UPDATE client_codes
  SET 
    label = CASE WHEN p_label IS NOT NULL THEN NULLIF(p_label, '') ELSE label END,
    client_name = CASE WHEN p_client_name IS NOT NULL THEN NULLIF(p_client_name, '') ELSE client_name END,
    client_email = CASE WHEN p_client_email IS NOT NULL THEN NULLIF(p_client_email, '') ELSE client_email END,
    notes = CASE WHEN p_notes IS NOT NULL THEN NULLIF(p_notes, '') ELSE notes END
  WHERE id = p_code_id
    AND deleted_at IS NULL;
END;
$$;

-- RPC: Delete (soft delete) a client code
CREATE OR REPLACE FUNCTION public.delete_client_code(p_code_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get project_id from client code
  SELECT project_id INTO v_project_id
  FROM client_codes
  WHERE id = p_code_id
    AND deleted_at IS NULL;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Client code not found';
  END IF;

  -- Check that user is agency_admin for this project
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
      AND role = 'agency_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be agency_admin';
  END IF;

  -- Soft delete
  UPDATE client_codes
  SET deleted_at = NOW()
  WHERE id = p_code_id
    AND deleted_at IS NULL;
END;
$$;

-- RPC: Regenerate a specific client code
CREATE OR REPLACE FUNCTION public.regenerate_client_code(p_code_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_new_code TEXT;
  v_hashed_code TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get project_id from client code
  SELECT project_id INTO v_project_id
  FROM client_codes
  WHERE id = p_code_id
    AND deleted_at IS NULL;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Client code not found';
  END IF;

  -- Check that user is agency_admin for this project
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
      AND role = 'agency_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be agency_admin';
  END IF;

  -- Generate new code and hash
  v_new_code := generate_client_code();
  v_hashed_code := hash_client_code(v_new_code);

  -- Ensure uniqueness
  WHILE EXISTS (
    SELECT 1 FROM client_codes 
    WHERE project_id = v_project_id 
      AND code_hash = v_hashed_code
      AND id != p_code_id
      AND deleted_at IS NULL
  ) LOOP
    v_new_code := generate_client_code();
    v_hashed_code := hash_client_code(v_new_code);
  END LOOP;

  -- Update code hash
  UPDATE client_codes
  SET 
    code_hash = v_hashed_code,
    is_active = TRUE,
    created_at = COALESCE(created_at, NOW())
  WHERE id = p_code_id
    AND deleted_at IS NULL;

  -- Return plaintext code ONCE
  RETURN v_new_code;
END;
$$;

-- RPC: Toggle client code active status
CREATE OR REPLACE FUNCTION public.toggle_client_code_status(
  p_code_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get project_id from client code
  SELECT project_id INTO v_project_id
  FROM client_codes
  WHERE id = p_code_id
    AND deleted_at IS NULL;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Client code not found';
  END IF;

  -- Check that user is agency_admin for this project
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
      AND role = 'agency_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be agency_admin';
  END IF;

  -- Update status
  UPDATE client_codes
  SET is_active = p_is_active
  WHERE id = p_code_id
    AND deleted_at IS NULL;
END;
$$;

-- Update accept_project_client_code to use client_codes table
CREATE OR REPLACE FUNCTION public.accept_project_client_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_code_hash TEXT;
  v_client_code RECORD;
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

  -- Find client code with matching hash, active, and not deleted
  SELECT 
    id,
    project_id,
    is_active
  INTO v_client_code
  FROM client_codes
  WHERE code_hash = v_code_hash
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;

  -- Fallback: Check old projects.client_code_hash for backward compatibility
  IF v_client_code IS NULL THEN
    SELECT id INTO v_project_id
    FROM projects
    WHERE (
      (client_code_hash = v_code_hash AND COALESCE(client_code_active, TRUE) = TRUE)
      OR client_code = p_code  -- Backward compatibility: check plaintext code
    )
    LIMIT 1;

    IF v_project_id IS NOT NULL THEN
      -- Auto-migrate: create client code entry
      INSERT INTO client_codes (
        project_id,
        code_hash,
        label,
        is_active,
        created_by
      )
      VALUES (
        v_project_id,
        v_code_hash,
        COALESCE((SELECT name FROM projects WHERE id = v_project_id), 'Default Client Code'),
        TRUE,
        v_user_id
      )
      ON CONFLICT (project_id, code_hash) DO NOTHING
      RETURNING project_id INTO v_project_id;
    END IF;
  ELSE
    v_project_id := v_client_code.project_id;
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_project_client_code(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_client_codes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_code_details(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_client_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_client_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_client_code_status(UUID, BOOLEAN) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.create_project_client_code(UUID, TEXT, TEXT, TEXT, TEXT) IS 
  'Creates a new client code for a project. Only agency_admin can call this. Returns plaintext code once.';
COMMENT ON FUNCTION public.get_project_client_codes(UUID) IS 
  'Returns all client codes for a project. Only agency_admin can call this.';
COMMENT ON FUNCTION public.update_client_code_details(UUID, TEXT, TEXT, TEXT, TEXT) IS 
  'Updates client code details (label, name, email, notes). Only agency_admin can call this.';
COMMENT ON FUNCTION public.delete_client_code(UUID) IS 
  'Soft deletes a client code. Only agency_admin can call this.';
COMMENT ON FUNCTION public.regenerate_client_code(UUID) IS 
  'Regenerates a specific client code. Only agency_admin can call this. Returns plaintext code once.';
COMMENT ON FUNCTION public.toggle_client_code_status(UUID, BOOLEAN) IS 
  'Toggles the active status of a client code. Only agency_admin can call this.';
