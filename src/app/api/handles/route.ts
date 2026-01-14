import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAndCheckSuspicion } from '@/lib/validation';
import type { ApiResponse, SubmitResponse, SortOption } from '@/lib/types';

// Type for database row (supports both old and new schema)
interface DbRow {
    id: string;
    handle?: string;        // old schema
    username?: string;      // new schema
    profile_url?: string;   // new schema
    created_at: string;
    status?: string;        // new schema (defaults to 'active' conceptually for old schema)
    reason?: string;        // new schema
}

// Check which schema is in use by examining table structure
async function hasNewSchema(): Promise<boolean> {
    // Try a simple query that would only work with new schema
    const { error } = await supabase
        .from('instagram_reports')
        .select('username')
        .limit(1);

    // If no error, new schema exists
    return !error;
}

// GET - Fetch all active handles (up to 1000) with sorting
export async function GET(request: Request): Promise<NextResponse<ApiResponse<DbRow[]>>> {
    try {
        const { searchParams } = new URL(request.url);
        const sort = (searchParams.get('sort') as SortOption) || 'newest';

        const useNewSchema = await hasNewSchema();

        let query = supabase
            .from('instagram_reports')
            .select('*');

        // Apply sorting based on sort option
        switch (sort) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'a-z':
                if (useNewSchema) {
                    query = query.order('username', { ascending: true });
                } else {
                    query = query.order('handle', { ascending: true });
                }
                break;
            case 'z-a':
                if (useNewSchema) {
                    query = query.order('username', { ascending: false });
                } else {
                    query = query.order('handle', { ascending: false });
                }
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

        // Transform data to normalize between old and new schema
        const normalizedData = (data || []).map((row: DbRow) => {
            const username = row.username || row.handle?.replace(/^@/, '') || '';
            return {
                ...row,
                username,
                profile_url: row.profile_url || `https://www.instagram.com/${username}/`,
                status: row.status || 'active',
            };
        }).filter(row => row.status === 'active'); // Only show active entries

        return NextResponse.json({ data: normalizedData });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

// POST - Submit a new handle with shadow-ban logic
export async function POST(request: Request): Promise<NextResponse<SubmitResponse>> {
    try {
        const body = await request.json();
        const { input } = body;

        // Full validation and suspicion check
        const result = validateAndCheckSuspicion(input);

        // Hard reject for invalid input (non-ASCII, invalid characters, etc.)
        if (!result.isValid || !result.username || !result.profileUrl) {
            return NextResponse.json(
                { success: false, error: result.error || 'Invalid Instagram username' },
                { status: 400 }
            );
        }

        const { username, profileUrl, isSuspicious, suspicionReason } = result;

        // Check which schema to use
        const useNewSchema = await hasNewSchema();

        let error;

        if (useNewSchema) {
            // New schema: insert with username, profile_url, status, reason
            const insertResult = await supabase
                .from('instagram_reports')
                .insert({
                    username,
                    profile_url: profileUrl,
                    status: isSuspicious ? 'shadow' : 'active',
                    reason: suspicionReason,
                });
            error = insertResult.error;
        } else {
            // Old schema: insert with handle column only
            // For suspicious entries, silently accept but don't insert (pseudo shadow-ban)
            if (isSuspicious) {
                return NextResponse.json({
                    success: true,
                    message: 'Submitted. Thanks.',
                });
            }

            const insertResult = await supabase
                .from('instagram_reports')
                .insert({ handle: username });
            error = insertResult.error;
        }

        if (error) {
            // Check for unique constraint violation
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

        // For shadow-banned entries (new schema only), return generic success message
        if (isSuspicious) {
            return NextResponse.json({
                success: true,
                message: 'Submitted. Thanks.',
            });
        }

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
