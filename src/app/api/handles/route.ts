import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateInput } from '@/lib/validation';
import type { InstagramReport, ApiResponse, SubmitResponse } from '@/lib/types';

// GET - Fetch all handles (up to 1000)
export async function GET(): Promise<NextResponse<ApiResponse<InstagramReport[]>>> {
    try {
        const { data, error } = await supabase
            .from('instagram_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

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

// POST - Submit a new handle
export async function POST(request: Request): Promise<NextResponse<SubmitResponse>> {
    try {
        const body = await request.json();
        const { input } = body;

        // Comprehensive validation (includes banned words check)
        const validationResult = validateInput(input);

        if (!validationResult.isValid || !validationResult.handle) {
            return NextResponse.json(
                { success: false, error: validationResult.error || 'Invalid Instagram handle' },
                { status: 400 }
            );
        }

        const handle = validationResult.handle;

        // Insert into database (unique constraint will handle duplicates)
        const { error } = await supabase
            .from('instagram_reports')
            .insert({ handle });

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

        return NextResponse.json({ success: true, handle });
    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
