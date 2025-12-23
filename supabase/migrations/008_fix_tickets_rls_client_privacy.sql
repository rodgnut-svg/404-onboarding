-- Fix tickets RLS to ensure clients can only see their own tickets
-- Agency members (agency_admin, agency_member) can see all tickets in their projects
-- Clients (client_admin, client_member) can only see tickets they created

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Project members can view tickets" ON tickets;

-- Create two separate policies for better privacy control

-- Agency members can view all tickets in projects they're members of
CREATE POLICY "Agency members can view all tickets"
  ON tickets FOR SELECT
  USING (
    is_project_member(project_id, auth.uid()) 
    AND is_agency_member(project_id, auth.uid())
  );

-- Clients can only view tickets they created (and must be project members)
CREATE POLICY "Clients can view their own tickets"
  ON tickets FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
    AND created_by = auth.uid()
    AND NOT is_agency_member(project_id, auth.uid())
  );

-- Add comment for documentation
COMMENT ON POLICY "Agency members can view all tickets" ON tickets IS 
  'Allows agency_admin and agency_member roles to view all tickets in their projects';
COMMENT ON POLICY "Clients can view their own tickets" ON tickets IS 
  'Allows client_admin and client_member roles to only view tickets they created';
