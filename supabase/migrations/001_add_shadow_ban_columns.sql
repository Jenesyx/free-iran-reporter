-- Migration: Add shadow-ban columns, indexes, and updated RLS policies
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Add username column (will be populated from handle)
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS username text;

-- Add profile_url column (canonical Instagram link)
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS profile_url text;

-- Add status column for shadow-ban logic
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add reason column for shadow-ban explanation (internal use only)
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS reason text;

-- Remove NOT NULL constraint from old handle column (if it exists)
-- This allows new inserts to use username instead of handle
ALTER TABLE instagram_reports ALTER COLUMN handle DROP NOT NULL;

-- ============================================================================
-- 2. BACKFILL EXISTING DATA
-- ============================================================================

-- Convert existing handle field to username (strip leading @ if present)
-- Populate profile_url for existing usernames
UPDATE instagram_reports
SET
  username = LOWER(REGEXP_REPLACE(handle, '^@', '')),
  profile_url = 'https://www.instagram.com/' || LOWER(REGEXP_REPLACE(handle, '^@', '')) || '/'
WHERE username IS NULL AND handle IS NOT NULL;

-- ============================================================================
-- 3. MAKE COLUMNS NOT NULL AFTER BACKFILL
-- ============================================================================

ALTER TABLE instagram_reports
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE instagram_reports
  ALTER COLUMN profile_url SET NOT NULL;

-- ============================================================================
-- 4. ADD UNIQUE CONSTRAINT ON USERNAME
-- ============================================================================

ALTER TABLE instagram_reports
  ADD CONSTRAINT instagram_reports_username_unique UNIQUE (username);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_instagram_reports_created_at 
  ON instagram_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_instagram_reports_status 
  ON instagram_reports(status);

-- ============================================================================
-- 6. UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Allow public select" ON instagram_reports;

-- Create new select policy that only shows active entries
CREATE POLICY "Allow public select active only"
  ON instagram_reports FOR SELECT
  USING (status = 'active');

-- Drop existing insert policy and recreate (allows all inserts, server validates)
DROP POLICY IF EXISTS "Allow public insert" ON instagram_reports;

CREATE POLICY "Allow public insert"
  ON instagram_reports FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 7. (OPTIONAL) DROP OLD HANDLE COLUMN AFTER VERIFICATION
-- Uncomment this after verifying the migration worked correctly
-- ============================================================================

-- ALTER TABLE instagram_reports DROP COLUMN IF EXISTS handle;
