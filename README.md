# 404Found Client Onboarding Portal

A production-ready onboarding portal for 404Found (website design agency) built with Next.js, TailwindCSS, shadcn/ui, and Supabase.

## Features

- **Secure Authentication**: Email magic link authentication via Supabase
- **Client Code System**: Agencies generate unique client codes for project access
- **5-Step Onboarding Wizard**: Comprehensive client onboarding with autosave
- **File Uploads**: Secure file storage with RLS policies
- **Project Timeline**: Visual milestone tracking with sticky cards
- **Approvals System**: Track and manage project approvals
- **Admin Dashboard**: Agency admins can create projects and track progress
- **Row Level Security**: Full RLS implementation for data security

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links)
- **Storage**: Supabase Storage
- **Security**: Row Level Security (RLS) policies

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- npm or yarn package manager

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy the contents of `supabase/migrations/001_init.sql`
4. Run the migration in the SQL Editor

### 3. Create Storage Bucket

In your Supabase dashboard:

1. Go to **Storage**
2. Create a new bucket named `project_uploads`
3. Set it to **Private**
4. Go to **Storage Policies** and add:

```sql
-- Allow project members to upload files
CREATE POLICY "Project members can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project_uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Allow project members to view files
CREATE POLICY "Project members can view files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project_uploads' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );
```

### 4. Configure Environment Variables

1. **Copy the template file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Open `.env.local` and fill in your actual values** from your Supabase dashboard.

3. **Quick setup - copy/paste this template:**
   ```env
   # Supabase Configuration (Required)
   # Find these in: Supabase Dashboard → Settings → API
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Bootstrap (Required)
   # Generate with: openssl rand -hex 32
   BOOTSTRAP_SECRET=your_secure_random_string_here

   # Site URL (Required)
   # Development: http://localhost:3000
   # Production: https://your-domain.com
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # GoHighLevel Integration (Optional)
   NEXT_PUBLIC_GHL_BOOKING_WIDGET_URL=
   GHL_WEBHOOK_URL=
   ```

**Where to find Supabase values:**

- **NEXT_PUBLIC_SUPABASE_URL**: Supabase Dashboard → Settings → API → "Project URL"
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → "Project API keys" → `anon` / `public` key
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → "Project API keys" → `service_role` key

**Security Notes:**

- ⚠️ **NEVER commit `.env.local`** - it's already in `.gitignore`
- ⚠️ **NEVER commit `SUPABASE_SERVICE_ROLE_KEY`** - this key has admin access
- In production, store the service role key only in your hosting platform's environment variables (Vercel/Netlify)
- The `.env.example` file is safe to commit - it contains no secrets

### 5. Bootstrap Your First Agency Admin

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Sign up with your email at `/login`

3. Visit `/setup`

4. Enter your bootstrap secret, agency name, and email

5. Click "Bootstrap Agency"

### 6. Create Your First Project

1. Log in with your bootstrapped account
2. Go to `/portal/admin`
3. Create a new project
4. Copy the generated client code
5. Share the client code with your client

### 7. Client Onboarding Flow

1. Client visits `/onboarding`
2. Client enters the client code
3. Client signs in via magic link
4. Client completes the 5-step onboarding wizard
5. Agency reviews progress in the admin dashboard

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── actions/                  # Server actions
│   │   ├── auth.ts              # Authentication actions
│   │   ├── onboarding.ts        # Onboarding step actions
│   │   ├── files.ts             # File upload actions
│   │   └── admin.ts             # Admin actions
│   ├── api/                     # API routes
│   │   └── setup/health/        # Health check endpoint
│   ├── portal/                  # Authenticated portal routes
│   │   └── [projectId]/         # Project-specific routes
│   │       ├── onboarding/      # Onboarding wizard
│   │       ├── uploads/         # File uploads
│   │       ├── approvals/       # Approvals
│   │       └── timeline/        # Timeline view
│   ├── onboarding/              # Public client code entry
│   ├── login/                   # Magic link sign-in
│   ├── auth/                    # Auth callbacks
│   └── setup/                   # Bootstrap setup
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   └── layout/                  # Layout components
├── lib/                         # Utility libraries
│   ├── supabase/                # Supabase clients
│   └── auth.ts                  # Auth helpers
└── supabase/
    └── migrations/              # Database migrations
        └── 001_init.sql         # Initial schema
```

## Routes

### Public Routes
- `/` - Redirects to `/onboarding`
- `/onboarding` - Client code entry
- `/login` - Magic link sign-in
- `/auth/callback` - Supabase auth callback
- `/setup` - Setup and bootstrap page

### Authenticated Routes
- `/portal` - Project selection (if multiple projects)
- `/portal/[projectId]` - Project dashboard
- `/portal/[projectId]/onboarding` - Onboarding overview
- `/portal/[projectId]/onboarding/step-1` through `step-5` - Wizard steps
- `/portal/[projectId]/uploads` - File uploads
- `/portal/[projectId]/approvals` - Approvals
- `/portal/[projectId]/timeline` - Timeline view

### Admin Routes
- `/portal/admin` - Agency admin dashboard

## Onboarding Steps

1. **Project Basics**: Business info, goals, deadlines, competitors, inspiration
2. **Brand & Style**: Logo, brand guide, colors, tone, dislikes
3. **Content**: Copy prompts or upload existing content, services, FAQs
4. **Access & Integrations**: Domain, hosting, analytics, booking systems
5. **Approvals & Kickoff**: Decision maker info, communication preferences, booking

## Security

- All tables have Row Level Security (RLS) enabled
- Users can only access projects they're members of
- File uploads are scoped to project membership
- Service role key only used server-side for sensitive operations
- Client code validation uses service role for security

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

1. Push your code to GitHub
2. Connect to Vercel/Netlify
3. Add environment variables in your hosting platform
4. Deploy!

## Troubleshooting

### Migration fails
- Make sure you're running the SQL in the Supabase SQL Editor
- Check that the UUID extension is enabled
- Verify you have the correct permissions

### Authentication not working
- Check that `NEXT_PUBLIC_SITE_URL` matches your actual domain
- Verify Supabase auth settings allow your domain
- Check browser console for errors

### File uploads fail
- Verify storage bucket exists and is named `project_uploads`
- Check storage policies are set up correctly
- Ensure RLS policies allow file access

### Bootstrap fails
- Make sure you've signed up first (bootstrap requires existing user)
- Verify `BOOTSTRAP_SECRET` matches what you entered
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## Design System

- **Colors**: Off-white background (#F7F7F5), black text (#111111), muted gray (#6B6B6B)
- **Typography**: Instrument Serif for headings, Inter for body text
- **Components**: Pill buttons, subtle shadows, minimal borders, lots of whitespace
- **Layout**: Centered content, editorial-style layout

## License

Private - 404Found Internal Use

