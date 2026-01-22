import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Debug endpoint to test handle_votes table access
export async function GET(): Promise<NextResponse> {
    try {
        // Test 1: Try to read ALL votes from handle_votes
        const { data: allVotes, error: allVotesError } = await supabase
            .from('handle_votes')
            .select('*')
            .limit(10);

        // Test 2: Count total rows
        const { count, error: countError } = await supabase
            .from('handle_votes')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            test1_allVotes: {
                error: allVotesError?.message || null,
                code: allVotesError?.code || null,
                data: allVotes,
                count: allVotes?.length || 0
            },
            test2_count: {
                error: countError?.message || null,
                total: count
            },
            message: 'If allVotes is empty but you expect data, the RLS policy is blocking reads'
        });
    } catch (err) {
        return NextResponse.json({
            error: 'Unexpected error',
            details: String(err)
        }, { status: 500 });
    }
}
