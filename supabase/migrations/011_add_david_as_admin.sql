-- Migration: Add davidmortleman@gmail.com as agency_admin to all projects
-- This migration finds David's user ID and adds him as agency_admin to all projects
-- in the same agency as the existing admin (rodgnut@gmail.com)

-- Step 1: Find David's user ID and the agency ID from the existing admin
DO $$
DECLARE
  v_david_user_id UUID;
  v_agency_id UUID;
  v_project_record RECORD;
BEGIN
  -- Find David's user ID
  SELECT id INTO v_david_user_id
  FROM auth.users
  WHERE email = 'davidmortleman@gmail.com'
  LIMIT 1;

  -- If David hasn't signed up yet, this will be NULL
  IF v_david_user_id IS NULL THEN
    RAISE NOTICE 'User davidmortleman@gmail.com not found. Please have David sign up first at /login, then run this migration again.';
    RETURN;
  END IF;

  -- Find the agency ID from the existing admin (rodgnut@gmail.com)
  SELECT DISTINCT p.agency_id INTO v_agency_id
  FROM projects p
  INNER JOIN project_members pm ON pm.project_id = p.id
  INNER JOIN auth.users u ON u.id = pm.user_id
  WHERE u.email = 'rodgnut@gmail.com'
    AND pm.role = 'agency_admin'
  LIMIT 1;

  -- If no agency found, try to get any agency
  IF v_agency_id IS NULL THEN
    SELECT id INTO v_agency_id
    FROM agencies
    LIMIT 1;
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE NOTICE 'No agency found. Please bootstrap the agency first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found David user ID: %', v_david_user_id;
  RAISE NOTICE 'Found agency ID: %', v_agency_id;

  -- Step 2: Add David as agency_admin to all projects in the agency
  FOR v_project_record IN
    SELECT id FROM projects WHERE agency_id = v_agency_id
  LOOP
    -- Insert or update David's membership as agency_admin
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (v_project_record.id, v_david_user_id, 'agency_admin')
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET role = 'agency_admin';

    RAISE NOTICE 'Added David as agency_admin to project: %', v_project_record.id;
  END LOOP;

  RAISE NOTICE 'Successfully added davidmortleman@gmail.com as agency_admin to all projects in agency: %', v_agency_id;
END $$;

-- Verification query (run this separately to check results)
-- SELECT 
--   u.email,
--   p.name as project_name,
--   pm.role
-- FROM project_members pm
-- INNER JOIN auth.users u ON u.id = pm.user_id
-- INNER JOIN projects p ON p.id = pm.project_id
-- WHERE u.email = 'davidmortleman@gmail.com'
-- ORDER BY p.name;

