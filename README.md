# Iran Freedom Reporter

A production-ready one-page website for documenting Instagram accounts spreading propaganda during internet shutdowns in Iran. Built with Next.js 14+, Tailwind CSS, TypeScript, and Supabase.

## Features

- 📝 Submit Instagram handles via username or profile URL
- ✅ Client-side verification with Instagram profile preview
- 👍👎 Like/Dislike voting system (anonymous, fingerprint-based)
- 🔄 Automatic deduplication
- 📋 Copy all handles to clipboard
- 🔍 Search and filter handles
- 📊 Sort by newest, oldest, A-Z, Z-A
- 💾 Persistent storage with Supabase
- 📱 Mobile-first responsive design
- ⚡ Optimistic UI updates

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Follow me on Instagram

[![Instagram](https://img.shields.io/badge/Instagram-1DA1F2?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/artabidkhori)

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to the SQL Editor and run the following migration:

```sql
-- Create the instagram_reports table
CREATE TABLE instagram_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  username TEXT,
  profile_url TEXT,
  status TEXT DEFAULT 'active',
  exists_status TEXT,
  checked_at TIMESTAMPTZ,
  reason TEXT,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster ordering
CREATE INDEX idx_instagram_reports_created_at ON instagram_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE instagram_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public SELECT
CREATE POLICY "Allow public read access"
  ON instagram_reports
  FOR SELECT TO anon
  USING (true);

-- Policy: Allow public INSERT
CREATE POLICY "Allow public insert access"
  ON instagram_reports
  FOR INSERT TO anon
  WITH CHECK (true);

-- Create the handle_votes table for like/dislike voting
CREATE TABLE handle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle_id UUID REFERENCES instagram_reports(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (handle_id, fingerprint)
);

-- Create indexes for handle_votes
CREATE INDEX idx_handle_votes_fingerprint ON handle_votes(fingerprint);
CREATE INDEX idx_handle_votes_handle_id ON handle_votes(handle_id);

-- Enable Row Level Security for handle_votes
ALTER TABLE handle_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public SELECT on votes
CREATE POLICY "Allow public vote read"
  ON handle_votes
  FOR SELECT USING (true);

-- Policy: Allow public INSERT on votes
CREATE POLICY "Allow public vote insert"
  ON handle_votes
  FOR INSERT WITH CHECK (true);

-- Policy: Allow public UPDATE on votes
CREATE POLICY "Allow public vote update"
  ON handle_votes
  FOR UPDATE USING (true);
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- Copy the **Project URL** and **anon public** key

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option 2: Manual Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── handles/
│   │   │   └── route.ts      # GET/POST API for handles
│   │   └── votes/
│   │       ├── route.ts      # POST API for voting
│   │       └── user/
│   │           └── route.ts  # GET user's votes
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Main page component
├── components/
│   ├── HandleList.tsx        # List container with search/sort/copy
│   ├── HandlePill.tsx        # Handle with like/dislike buttons
│   ├── Hero.tsx              # Title and description
│   ├── InputSection.tsx      # Form with verification flow
│   ├── LoadingSkeleton.tsx   # Loading placeholder
│   ├── FeedbackSection.tsx   # Community feedback form
│   ├── Footer.tsx            # Site footer
│   ├── SortDropdown.tsx      # Sort options dropdown
│   └── Toast.tsx             # Notification component
└── lib/
    ├── fingerprint.ts        # Browser fingerprint generation
    ├── instagramCheck.ts     # Server-side profile check
    ├── instagramClientCheck.ts # Client-side verification
    ├── validation.ts         # Input validation utilities
    ├── voteStorage.ts        # LocalStorage vote tracking
    ├── supabase.ts           # Supabase client
    └── types.ts              # TypeScript interfaces
```