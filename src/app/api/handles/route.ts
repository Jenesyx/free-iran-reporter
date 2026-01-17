import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAndCheckSuspicion } from '@/lib/validation';
import { checkInstagramProfile } from '@/lib/instagramCheck';
import type { ApiResponse, SubmitResponse, SortOption } from '@/lib/types';

// ============================================================================
// RATE LIMITING (Best-effort, in-memory per instance)
// ============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

/**
 * Simple in-memory rate limiter (resets on cold starts)
 */
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        // No entry or expired, create new
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true; // allowed
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false; // rate limited
    }

    entry.count++;
    return true; // allowed
}

/**
 * Clean up old rate limit entries periodically (every 5 minutes)
 */
function cleanupRateLimits(): void {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetAt) {
            rateLimitMap.delete(ip);
        }
    }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Type for database row
interface DbRow {
    id: string;
    handle?: string;        // old schema (deprecated)
    username: string;
    profile_url: string;
    created_at: string;
    status: string;
    exists_status?: string;
    checked_at?: string;
    reason?: string;
}

// ============================================================================
// GET - Fetch all active handles with sorting
// ============================================================================

export async function GET(request: Request): Promise<NextResponse<ApiResponse<DbRow[]>>> {
    try {
        const { searchParams } = new URL(request.url);
        const sort = (searchParams.get('sort') as SortOption) || 'newest';

        let query = supabase
            .from('instagram_reports')
            .select('*');

        // RLS policy already filters to status='active' only
        // But we add explicit filter for safety
        query = query.eq('status', 'active');

        // Apply sorting
        switch (sort) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'a-z':
                query = query.order('username', { ascending: true });
                break;
            case 'z-a':
                query = query.order('username', { ascending: false });
                break;
            case 'newest':
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        // Limit results
        query = query.limit(1000);

        const { data, error } = await query;

        if (error) {
            console.error('Supabase fetch error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch handles' },
                { status: 500 }
            );
        }

        // Normalize data
        const normalizedData = (data || []).map((row: DbRow) => ({
            ...row,
            username: row.username || row.handle?.replace(/^@/, '') || '',
            profile_url: row.profile_url || `https://www.instagram.com/${row.username}/`,
        }));

        return NextResponse.json({ data: normalizedData });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Submit a new handle with validation and existence check
// ============================================================================

export async function POST(request: Request): Promise<NextResponse<SubmitResponse>> {
    try {
        // Get client IP for rate limiting
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

        // Check rate limit
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please wait a minute.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { input } = body;

        // Full validation and suspicion check
        const result = validateAndCheckSuspicion(input);

        // Hard reject for invalid input
        if (!result.isValid || !result.username || !result.profileUrl) {
            return NextResponse.json(
                { success: false, error: result.error || 'Invalid Instagram username' },
                { status: 400 }
            );
        }

        const { username, profileUrl, isSuspicious, suspicionReason } = result;

        // Check if the username already exists in the database
        const { data: existingEntry } = await supabase
            .from('instagram_reports')
            .select('id, status')
            .eq('username', username)
            .single();

        // If entry exists and is active, return already added
        if (existingEntry && existingEntry.status === 'active') {
            return NextResponse.json(
                { success: false, error: 'Already added.' },
                { status: 409 }
            );
        }

        // If already suspicious from validation, shadow-ban without checking Instagram
        if (isSuspicious) {
            if (existingEntry) {
                // Update existing entry to shadow
                await supabase
                    .from('instagram_reports')
                    .update({
                        profile_url: profileUrl,
                        status: 'shadow',
                        exists_status: 'unknown',
                        checked_at: new Date().toISOString(),
                        reason: suspicionReason,
                    })
                    .eq('id', existingEntry.id);
            } else {
                // Insert new shadow entry
                await supabase
                    .from('instagram_reports')
                    .insert({
                        username,
                        profile_url: profileUrl,
                        status: 'shadow',
                        exists_status: 'unknown',
                        checked_at: new Date().toISOString(),
                        reason: suspicionReason,
                    });
            }

            // Generic success (don't reveal shadow-ban)
            return NextResponse.json({
                success: true,
                message: 'Submitted. Thanks.',
            });
        }

        // Check if Instagram profile exists
        const existsStatus = await checkInstagramProfile(username);
        const checkedAt = new Date().toISOString();

        // Handle based on existence status
        if (existsStatus === 'not_found') {
            // Profile doesn't exist on Instagram - reject
            return NextResponse.json(
                { success: false, error: 'Username not found on Instagram.' },
                { status: 400 }
            );
        }

        // IMPORTANT: When Instagram check is 'unknown' (e.g., blocked by Instagram on cloud IPs),
        // we still add the user as 'active' to avoid false shadow-bans on production.
        // Only 'not_found' should reject. This is safer for user experience.
        const status = 'active';  // Always add as active if not explicitly not_found
        const reason = existsStatus === 'unknown' ? 'Instagram check was inconclusive (cloud IP blocked)' : null;

        if (existingEntry) {
            // Update existing entry (was shadow-banned, now potentially active)
            const { error } = await supabase
                .from('instagram_reports')
                .update({
                    profile_url: profileUrl,
                    status,
                    exists_status: existsStatus,
                    checked_at: checkedAt,
                    reason,
                })
                .eq('id', existingEntry.id);

            if (error) {
                console.error('Supabase update error:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to update handle' },
                    { status: 500 }
                );
            }
        } else {
            // Insert new record
            const { error } = await supabase
                .from('instagram_reports')
                .insert({
                    username,
                    profile_url: profileUrl,
                    status,
                    exists_status: existsStatus,
                    checked_at: checkedAt,
                    reason,
                });

            if (error) {
                // Check for unique constraint violation (race condition)
                if (error.code === '23505') {
                    return NextResponse.json(
                        { success: false, error: 'Already added.' },
                        { status: 409 }
                    );
                }
                console.error('Supabase insert error:', error);
                return NextResponse.json(
                    { success: false, error: 'Failed to submit handle' },
                    { status: 500 }
                );
            }
        }

        // Success - entry added as active
        return NextResponse.json({
            success: true,
            username,
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
