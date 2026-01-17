-- ============================================================================
-- Migration: Create instagram_reports_feedback table
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create the feedback table
CREATE TABLE IF NOT EXISTS instagram_reports_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by username
CREATE INDEX IF NOT EXISTS idx_feedback_username ON instagram_reports_feedback(reported_username);

-- Create index for sorting by date
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON instagram_reports_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE instagram_reports_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert feedback (public submissions)
CREATE POLICY "Allow public insert" ON instagram_reports_feedback
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Allow anyone to read feedback (public transparency)
CREATE POLICY "Allow public read" ON instagram_reports_feedback
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Note: No UPDATE or DELETE policies - feedback is permanent
-- This ensures transparency and prevents manipulation

-- ============================================================================
-- Verification: Check the table was created
-- ============================================================================
-- Run this to verify:
-- SELECT * FROM instagram_reports_feedback LIMIT 10;
