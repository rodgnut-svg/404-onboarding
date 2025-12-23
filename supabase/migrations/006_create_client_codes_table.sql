-- Migration: Create client_codes table for multiple client codes per project
-- This replaces the single client_code_hash column on projects table

-- Create client_codes table
CREATE TABLE IF NOT EXISTS client_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  label TEXT NOT NULL, -- Display name (e.g., "Client A", "Marketing Team")
  client_name TEXT, -- Optional client name
  client_email TEXT, -- Optional client email
  notes TEXT, -- Optional notes/description
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ, -- Soft delete
  CONSTRAINT unique_project_code_hash UNIQUE(project_id, code_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_codes_project_id ON client_codes(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_codes_code_hash ON client_codes(code_hash) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_codes_created_by ON client_codes(created_by) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE client_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Agency admins can view client codes for their projects
CREATE POLICY "Agency admins can view client codes for their projects"
  ON client_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = client_codes.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'agency_admin'
    )
  );

-- RLS Policy: Agency admins can insert client codes for their projects
CREATE POLICY "Agency admins can insert client codes for their projects"
  ON client_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = client_codes.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'agency_admin'
    )
    AND created_by = auth.uid()
  );

-- RLS Policy: Agency admins can update client codes for their projects
CREATE POLICY "Agency admins can update client codes for their projects"
  ON client_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = client_codes.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'agency_admin'
    )
  );

-- Note: Soft deletes are handled via UPDATE (setting deleted_at), so the update policy above covers deletion
-- The delete policy below is redundant but kept for clarity - soft deletes use UPDATE

-- Migrate existing client_code_hash from projects table to client_codes table
-- Only migrate if the project has a client_code_hash and no codes exist yet
INSERT INTO client_codes (project_id, code_hash, label, is_active, created_at, created_by)
SELECT 
  p.id AS project_id,
  p.client_code_hash AS code_hash,
  COALESCE(p.name || ' - Default Code', 'Default Client Code') AS label,
  COALESCE(p.client_code_active, TRUE) AS is_active,
  COALESCE(p.client_code_created_at, p.created_at, NOW()) AS created_at,
  (
    SELECT pm.user_id 
    FROM project_members pm 
    WHERE pm.project_id = p.id 
      AND pm.role = 'agency_admin' 
    LIMIT 1
  ) AS created_by
FROM projects p
WHERE p.client_code_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_codes cc 
    WHERE cc.project_id = p.id 
      AND cc.code_hash = p.client_code_hash
  )
ON CONFLICT DO NOTHING;
