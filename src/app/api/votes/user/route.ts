import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================================
// POST - Get user's votes for specified handles (using POST to avoid URL length limits)
// ============================================================================

interface UserVotesRequest {
    fingerprint: string;
    handleIds: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body: UserVotesRequest = await request.json();
        const { fingerprint, handleIds } = body;

        console.log('[User Votes] Request received, fingerprint length:', fingerprint?.length, 'handleIds count:', handleIds?.length);

        if (!fingerprint) {
            return NextResponse.json(
                { error: 'Fingerprint required' },
                { status: 400 }
            );
        }

        if (!handleIds || handleIds.length === 0) {
            return NextResponse.json({ votes: {} });
        }

        // Limit to first 100 handles to avoid query issues
        const limitedHandleIds = handleIds.slice(0, 100);

        // Fetch user's votes for the specified handles
        const { data, error } = await supabase
            .from('handle_votes')
            .select('handle_id, vote_type')
            .eq('fingerprint', fingerprint)
            .in('handle_id', limitedHandleIds);

        if (error) {
            console.error('[User Votes] Supabase error:', error.message, error.code, error.details);
            // Return empty votes instead of 500 error - this is not critical
            return NextResponse.json({ votes: {} });
        }

        console.log('[User Votes] Found', data?.length || 0, 'votes for user');

        // Convert to a map of handleId -> voteType
        const votesMap: Record<string, 'like' | 'dislike'> = {};
        for (const vote of data || []) {
            votesMap[vote.handle_id] = vote.vote_type;
        }

        return NextResponse.json({ votes: votesMap });

    } catch (err) {
        console.error('[User Votes] Unexpected error:', err);
        // Return empty votes instead of 500 error - this is not critical
        return NextResponse.json({ votes: {} });
    }
}
