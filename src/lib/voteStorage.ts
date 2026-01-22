/**
 * Vote Storage Utility
 * 
 * Manages local storage for vote data to provide instant UI feedback
 * and reduce unnecessary API calls.
 */

export type VoteType = 'like' | 'dislike';

interface VoteRecord {
    handleId: string;
    voteType: VoteType;
    votedAt: number;
}

const VOTES_STORAGE_KEY = 'ifr_votes';

/**
 * Get all votes from localStorage
 */
function getAllVotes(): Record<string, VoteRecord> {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(VOTES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save all votes to localStorage
 */
function saveAllVotes(votes: Record<string, VoteRecord>): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
    } catch {
        // Storage full or not available, silently fail
    }
}

/**
 * Get the user's vote for a specific handle
 */
export function getVote(handleId: string): VoteType | null {
    const votes = getAllVotes();
    return votes[handleId]?.voteType || null;
}

/**
 * Get all user votes as a map of handleId -> voteType
 */
export function getAllUserVotes(): Record<string, VoteType> {
    const votes = getAllVotes();
    const result: Record<string, VoteType> = {};

    for (const [handleId, record] of Object.entries(votes)) {
        result[handleId] = record.voteType;
    }

    return result;
}

/**
 * Save a vote for a handle
 */
export function saveVote(handleId: string, voteType: VoteType): void {
    const votes = getAllVotes();

    votes[handleId] = {
        handleId,
        voteType,
        votedAt: Date.now(),
    };

    saveAllVotes(votes);
}

/**
 * Remove a vote for a handle
 */
export function removeVote(handleId: string): void {
    const votes = getAllVotes();
    delete votes[handleId];
    saveAllVotes(votes);
}

/**
 * Check if user has voted on a handle
 */
export function hasVoted(handleId: string): boolean {
    const votes = getAllVotes();
    return handleId in votes;
}

/**
 * Clear all votes (for testing)
 */
export function clearAllVotes(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(VOTES_STORAGE_KEY);
}
