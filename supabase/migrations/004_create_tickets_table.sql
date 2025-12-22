-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ticket replies table
CREATE TABLE ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_project_id ON tickets(project_id);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_author_id ON ticket_replies(author_id);
CREATE INDEX idx_ticket_replies_created_at ON ticket_replies(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

-- Tickets RLS Policies
-- All project members can view tickets
CREATE POLICY "Project members can view tickets"
  ON tickets FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

-- All project members can create tickets
CREATE POLICY "Project members can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()) AND created_by = auth.uid());

-- Only agency members can update ticket status
CREATE POLICY "Agency members can update tickets"
  ON tickets FOR UPDATE
  USING (is_agency_member(project_id, auth.uid()));

-- Ticket Replies RLS Policies
-- All project members can view replies (via ticket membership check)
CREATE POLICY "Project members can view ticket replies"
  ON ticket_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_replies.ticket_id
        AND is_project_member(t.project_id, auth.uid())
    )
  );

-- All project members can create replies (via ticket membership check)
CREATE POLICY "Project members can create ticket replies"
  ON ticket_replies FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_replies.ticket_id
        AND is_project_member(t.project_id, auth.uid())
    )
  );

-- Add comment for documentation
COMMENT ON TABLE tickets IS 'Client tickets for website updates and inquiries';
COMMENT ON TABLE ticket_replies IS 'Replies/comments on tickets';
