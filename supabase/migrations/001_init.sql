-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agencies table
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ghl_location_id TEXT,
  ghl_booking_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project members table
CREATE TABLE project_members (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('agency_admin', 'agency_member', 'client_admin', 'client_member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Onboarding submissions table
CREATE TABLE onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 5),
  data JSONB NOT NULL DEFAULT '{}',
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, step)
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Milestones table
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'pending_approval', 'approved')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approvals table
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_onboarding_submissions_project_id ON onboarding_submissions(project_id);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_approvals_project_id ON approvals(project_id);
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_audit_log_project_id ON audit_log(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for onboarding_submissions
CREATE TRIGGER update_onboarding_submissions_updated_at
  BEFORE UPDATE ON onboarding_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is agency member
CREATE OR REPLACE FUNCTION is_agency_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_uuid 
      AND pm.user_id = user_uuid
      AND pm.role IN ('agency_admin', 'agency_member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Projects RLS Policies (projects are not directly readable, use service role for client_code lookup)
CREATE POLICY "Project members can view their projects"
  ON projects FOR SELECT
  USING (is_project_member(id, auth.uid()));

-- Project Members RLS Policies
CREATE POLICY "Project members can view members of their projects"
  ON project_members FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

-- Onboarding Submissions RLS Policies
CREATE POLICY "Project members can view submissions"
  ON onboarding_submissions FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can insert submissions"
  ON onboarding_submissions FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can update submissions"
  ON onboarding_submissions FOR UPDATE
  USING (is_project_member(project_id, auth.uid()));

-- Files RLS Policies
CREATE POLICY "Project members can view files"
  ON files FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can insert files"
  ON files FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()));

-- Milestones RLS Policies
CREATE POLICY "Project members can view milestones"
  ON milestones FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Agency members can update milestones"
  ON milestones FOR UPDATE
  USING (is_agency_member(project_id, auth.uid()));

-- Approvals RLS Policies
CREATE POLICY "Project members can view approvals"
  ON approvals FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Agency members can update approvals"
  ON approvals FOR UPDATE
  USING (is_agency_member(project_id, auth.uid()));

-- Comments RLS Policies
CREATE POLICY "Project members can view comments"
  ON comments FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can insert comments"
  ON comments FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()));

-- Audit Log RLS Policies
CREATE POLICY "Project members can view audit logs"
  ON audit_log FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

-- Agencies RLS Policies (only agency admins can view)
CREATE POLICY "Agency admins can view agencies"
  ON agencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.user_id = auth.uid()
        AND pm.role = 'agency_admin'
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = pm.project_id
            AND p.agency_id = agencies.id
        )
    )
  );

-- Storage bucket setup (run via Supabase dashboard or API, but document here)
-- CREATE BUCKET project_uploads WITH PUBLIC false;
-- CREATE POLICY "Project members can upload files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'project_uploads' AND
--     (storage.foldername(name))[1] IN (
--       SELECT p.id::text FROM projects p
--       INNER JOIN project_members pm ON pm.project_id = p.id
--       WHERE pm.user_id = auth.uid()
--     )
--   );
-- CREATE POLICY "Project members can view files"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'project_uploads' AND
--     (storage.foldername(name))[1] IN (
--       SELECT p.id::text FROM projects p
--       INNER JOIN project_members pm ON pm.project_id = p.id
--       WHERE pm.user_id = auth.uid()
--     )
--   );

