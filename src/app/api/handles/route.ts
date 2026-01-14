import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateAndCheckSuspicion } from '@/lib/validation';
import type { InstagramReport, ApiResponse, SubmitResponse, SortOption } from '@/lib/types';

// GET - Fetch all active handles (up to 1000) with sorting
export async function GET(request: Request): Promise<NextResponse<ApiResponse<InstagramReport[]>>> {
    try {
        const { searchParams } = new URL(request.url);
        const sort = (searchParams.get('sort') as SortOption) || 'newest';

        // Build query with sort
        let query = supabase
            .from('instagram_reports')
            .select('id, username, profile_url, created_at, status, reason')
            .eq('status', 'active'); // Only show active entries

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

        return NextResponse.json({ data: data || [] });
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

        // Determine status based on suspicion
        const status = isSuspicious ? 'shadow' : 'active';
        const reason = suspicionReason;

        // Insert into database
        const { error } = await supabase
            .from('instagram_reports')
            .insert({
                username,
                profile_url: profileUrl,
                status,
                reason,
            });

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

        // For shadow-banned entries, return generic success message
        // For active entries, return the username
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
