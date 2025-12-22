-- Update profiles RLS policy to allow project members to view profiles of other project members
-- This is needed for displaying ticket creator information

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create a new policy that allows viewing profiles of project members
CREATE POLICY "Users can view profiles of project members"
  ON profiles FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    OR
    -- User can view profiles of users who are members of the same projects
    EXISTS (
      SELECT 1 FROM project_members pm1
      INNER JOIN project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = profiles.id
    )
  );
