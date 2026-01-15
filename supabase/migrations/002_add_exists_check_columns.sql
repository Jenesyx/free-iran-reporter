-- Migration: Add Instagram existence check columns
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Add exists_status column to track Instagram profile verification result
-- Values: 'exists', 'not_found', 'unknown'
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS exists_status text NOT NULL DEFAULT 'unknown';

-- Add checked_at column to track when the Instagram check was performed
ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS checked_at timestamptz;

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_instagram_reports_exists_status 
  ON instagram_reports(exists_status);

-- ============================================================================
-- 3. UPDATE RLS POLICIES
-- ============================================================================

-- Ensure SELECT policy only returns active entries
-- (Drop and recreate to ensure it's correct)

DROP POLICY IF EXISTS "Allow public select" ON instagram_reports;
DROP POLICY IF EXISTS "Allow public select active only" ON instagram_reports;

CREATE POLICY "Allow public select active only"
  ON instagram_reports FOR SELECT
  USING (status = 'active');

-- Ensure INSERT policy exists
DROP POLICY IF EXISTS "Allow public insert" ON instagram_reports;

CREATE POLICY "Allow public insert"
  ON instagram_reports FOR INSERT
  WITH CHECK (true);

-- Explicitly deny UPDATE and DELETE for public
-- (RLS defaults to deny if no policy exists, but let's be explicit)

DROP POLICY IF EXISTS "Deny public update" ON instagram_reports;
DROP POLICY IF EXISTS "Deny public delete" ON instagram_reports;

-- No UPDATE or DELETE policies = denied by default when RLS is enabled

-- ============================================================================
-- 4. VERIFY RLS IS ENABLED
-- ============================================================================

ALTER TABLE instagram_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE
-- ============================================================================

-- To verify the migration worked:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'instagram_reports';
