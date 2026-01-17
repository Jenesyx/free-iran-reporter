import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================================
// RATE LIMITING (Best-effort, in-memory per instance)
// ============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 feedback per minute per IP

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}

// ============================================================================
// POST - Submit feedback about an existing username
// ============================================================================

export async function POST(request: Request): Promise<NextResponse> {
    try {
        // Get client IP for rate limiting
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

        // Check rate limit
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { success: false, error: 'Too many feedback submissions. Please wait a minute.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { username, message } = body;

        // Validate username
        if (!username || typeof username !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Username is required' },
                { status: 400 }
            );
        }

        // Validate message
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Feedback message is required' },
                { status: 400 }
            );
        }

        // Check message length
        const trimmedMessage = message.trim();
        if (trimmedMessage.length < 10) {
            return NextResponse.json(
                { success: false, error: 'Feedback must be at least 10 characters' },
                { status: 400 }
            );
        }

        if (trimmedMessage.length > 1000) {
            return NextResponse.json(
                { success: false, error: 'Feedback must be less than 1000 characters' },
                { status: 400 }
            );
        }

        // Normalize username (lowercase, no @)
        const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();

        // Verify that the username exists in the main list
        const { data: existingEntry, error: lookupError } = await supabase
            .from('instagram_reports')
            .select('id, username')
            .eq('username', normalizedUsername)
            .single();

        if (lookupError || !existingEntry) {
            return NextResponse.json(
                { success: false, error: 'This username is not in our list. You can only report existing entries.' },
                { status: 400 }
            );
        }

        // Insert the feedback
        const { error: insertError } = await supabase
            .from('instagram_reports_feedback')
            .insert({
                reported_username: normalizedUsername,
                message: trimmedMessage,
            });

        if (insertError) {
            console.error('Feedback insert error:', insertError);
            return NextResponse.json(
                { success: false, error: 'Failed to submit feedback. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Thank you for your feedback!',
        });

    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
