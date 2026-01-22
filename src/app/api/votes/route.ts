import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface VoteRequest {
    handleId: string;
    voteType: 'like' | 'dislike';
    fingerprint: string;
}

interface VoteResponse {
    success: boolean;
    likes?: number;
    dislikes?: number;
    userVote?: 'like' | 'dislike' | null;
    error?: string;
}

// ============================================================================
// POST - Submit or update a vote
// ============================================================================

export async function POST(request: Request): Promise<NextResponse<VoteResponse>> {
    try {
        const body: VoteRequest = await request.json();
        const { handleId, voteType, fingerprint } = body;

        // Validate input
        if (!handleId || !voteType || !fingerprint) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!['like', 'dislike'].includes(voteType)) {
            return NextResponse.json(
                { success: false, error: 'Invalid vote type' },
                { status: 400 }
            );
        }

        if (fingerprint.length < 10) {
            return NextResponse.json(
                { success: false, error: 'Invalid fingerprint' },
                { status: 400 }
            );
        }

        // Check if handle exists
        const { data: handle, error: handleError } = await supabase
            .from('instagram_reports')
            .select('id, likes, dislikes')
            .eq('id', handleId)
            .single();

        if (handleError || !handle) {
            return NextResponse.json(
                { success: false, error: 'Handle not found' },
                { status: 404 }
            );
        }

        // Check for existing vote
        const { data: existingVote } = await supabase
            .from('handle_votes')
            .select('id, vote_type')
            .eq('handle_id', handleId)
            .eq('fingerprint', fingerprint)
            .single();

        let newLikes = handle.likes || 0;
        let newDislikes = handle.dislikes || 0;

        if (existingVote) {
            // User already voted
            if (existingVote.vote_type === voteType) {
                // Same vote - do nothing, return current state
                return NextResponse.json({
                    success: true,
                    likes: newLikes,
                    dislikes: newDislikes,
                    userVote: voteType,
                });
            }

            // Different vote - update the vote
            const { error: updateVoteError } = await supabase
                .from('handle_votes')
                .update({ vote_type: voteType })
                .eq('id', existingVote.id);

            if (updateVoteError) {
                console.error('Vote update error:', updateVoteError);
                return NextResponse.json(
                    { success: false, error: 'Failed to update vote' },
                    { status: 500 }
                );
            }

            // Adjust counts (remove old vote, add new vote)
            if (existingVote.vote_type === 'like') {
                newLikes = Math.max(0, newLikes - 1);
            } else {
                newDislikes = Math.max(0, newDislikes - 1);
            }

            if (voteType === 'like') {
                newLikes++;
            } else {
                newDislikes++;
            }
        } else {
            // New vote - insert it
            const { error: insertError } = await supabase
                .from('handle_votes')
                .insert({
                    handle_id: handleId,
                    fingerprint,
                    vote_type: voteType,
                });

            if (insertError) {
                // Check for unique constraint violation (race condition)
                if (insertError.code === '23505') {
                    return NextResponse.json(
                        { success: false, error: 'You have already voted' },
                        { status: 409 }
                    );
                }
                console.error('Vote insert error:', insertError);
                return NextResponse.json(
                    { success: false, error: 'Failed to submit vote' },
                    { status: 500 }
                );
            }

            // Increment the appropriate count
            if (voteType === 'like') {
                newLikes++;
            } else {
                newDislikes++;
            }
        }

        // Update the handle's vote counts
        const { error: updateCountError } = await supabase
            .from('instagram_reports')
            .update({ likes: newLikes, dislikes: newDislikes })
            .eq('id', handleId);

        if (updateCountError) {
            console.error('Count update error:', updateCountError);
            // Vote was recorded, but count update failed
            // Return success anyway - counts can be recalculated
        }

        return NextResponse.json({
            success: true,
            likes: newLikes,
            dislikes: newDislikes,
            userVote: voteType,
        });

    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET - Get user's votes for specified handles
// ============================================================================

export async function GET(request: Request): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const fingerprint = searchParams.get('fingerprint');
        const handleIds = searchParams.get('handleIds');

        if (!fingerprint) {
            return NextResponse.json(
                { error: 'Fingerprint required' },
                { status: 400 }
            );
        }

        // Build query for user's votes
        let query = supabase
            .from('handle_votes')
            .select('handle_id, vote_type')
            .eq('fingerprint', fingerprint);

        // If specific handleIds are requested, filter by them
        if (handleIds) {
            const ids = handleIds.split(',').filter(id => id.length > 0);
            if (ids.length > 0) {
                query = query.in('handle_id', ids);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Fetch votes error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch votes' },
                { status: 500 }
            );
        }

        // Convert to a map of handleId -> voteType
        const votesMap: Record<string, 'like' | 'dislike'> = {};
        for (const vote of data || []) {
            votesMap[vote.handle_id] = vote.vote_type;
        }

        return NextResponse.json({ votes: votesMap });

    } catch (err) {
        console.error('Unexpected error:', err);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
