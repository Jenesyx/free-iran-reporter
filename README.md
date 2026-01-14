# Iran Freedom Reporter

A production-ready one-page website for documenting Instagram accounts spreading propaganda during internet shutdowns in Iran. Built with Next.js 14+, Tailwind CSS, TypeScript, and Supabase.

## Features

- 📝 Submit Instagram handles via username or profile URL
- ✅ Client-side and server-side validation
- 🔄 Automatic deduplication
- 📋 Copy all handles to clipboard
- 💾 Persistent storage with Supabase
- 📱 Mobile-first responsive design
- ⚡ Optimistic UI updates

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster ordering
CREATE INDEX idx_instagram_reports_created_at ON instagram_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE instagram_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public SELECT
CREATE POLICY "Allow public read access"
  ON instagram_reports
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow public INSERT
CREATE POLICY "Allow public insert access"
  ON instagram_reports
  FOR INSERT
  TO anon
  WITH CHECK (true);
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
│   │   └── handles/
│   │       └── route.ts      # GET/POST API endpoints
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Main page component
├── components/
│   ├── HandleList.tsx        # List container with copy button
│   ├── HandlePill.tsx        # Individual handle pill
│   ├── Hero.tsx              # Title and description
│   ├── InputSection.tsx      # Form with validation
│   ├── LoadingSkeleton.tsx   # Loading placeholder
│   └── Toast.tsx             # Notification component
└── lib/
    ├── instagram.ts          # Parsing/validation utilities
    ├── supabase.ts           # Supabase client
    └── types.ts              # TypeScript interfaces
```

---

## Supported Input Formats

The following Instagram handle formats are accepted:

| Input | Normalized |
|-------|------------|
| `@username` | `username` |
| `username` | `username` |
| `https://instagram.com/username` | `username` |
| `https://www.instagram.com/username/` | `username` |
| `instagram.com/username?igshid=abc` | `username` |

---

## API Reference

### GET /api/handles

Fetch the latest 1000 handles.

**Response:**
```json
{
  "data": [
    { "id": "uuid", "handle": "username", "created_at": "2024-01-01T00:00:00Z" }
  ]
}
```

### POST /api/handles

Submit a new handle.

**Request:**
```json
{ "input": "@username" }
```

**Response (success):**
```json
{ "success": true, "handle": "username" }
```

**Response (duplicate):**
```json
{ "success": false, "error": "This handle has already been reported" }
```

---

## License

MIT
