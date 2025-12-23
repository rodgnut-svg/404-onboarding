-- Website URLs table for projects
CREATE TABLE project_website_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX idx_project_website_urls_project_id ON project_website_urls(project_id);

-- Enable RLS
ALTER TABLE project_website_urls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project members can view website URLs"
  ON project_website_urls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_website_urls.project_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can manage website URLs"
  ON project_website_urls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_website_urls.project_id
        AND user_id = auth.uid()
        AND role = 'agency_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_website_urls.project_id
        AND user_id = auth.uid()
        AND role = 'agency_admin'
    )
  );

-- Function to update updated_at timestamp (reuse existing function from 001_init.sql)
CREATE TRIGGER update_project_website_urls_updated_at
  BEFORE UPDATE ON project_website_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
