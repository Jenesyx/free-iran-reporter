'use client';

import { useState } from 'react';
import type { VoteType } from '@/lib/types';

interface HandlePillProps {
    id: string;
    username: string;
    profileUrl: string;
    likes: number;
    dislikes: number;
    userVote: VoteType | null;
    onVote: (handleId: string, voteType: VoteType) => Promise<void>;
}

export default function HandlePill({
    id,
    username,
    profileUrl,
    likes,
    dislikes,
    userVote,
    onVote
}: HandlePillProps) {
    const [isVoting, setIsVoting] = useState(false);
    const [localLikes, setLocalLikes] = useState(likes);
    const [localDislikes, setLocalDislikes] = useState(dislikes);
    const [localUserVote, setLocalUserVote] = useState<VoteType | null>(userVote);

    const handleVote = async (e: React.MouseEvent, voteType: VoteType) => {
        e.preventDefault();
        e.stopPropagation();

        if (isVoting) return;

        // Optimistic update
        const prevVote = localUserVote;
        const prevLikes = localLikes;
        const prevDislikes = localDislikes;

        // Calculate new counts
        let newLikes = localLikes;
        let newDislikes = localDislikes;

        if (prevVote === voteType) {
            // Clicking same vote - do nothing (can't remove vote)
            return;
        }

        // Remove previous vote count
        if (prevVote === 'like') {
            newLikes = Math.max(0, newLikes - 1);
        } else if (prevVote === 'dislike') {
            newDislikes = Math.max(0, newDislikes - 1);
        }

        // Add new vote count
        if (voteType === 'like') {
            newLikes++;
        } else {
            newDislikes++;
        }

        // Apply optimistic update
        setLocalLikes(newLikes);
        setLocalDislikes(newDislikes);
        setLocalUserVote(voteType);
        setIsVoting(true);

        try {
            await onVote(id, voteType);
        } catch {
            // Revert on error
            setLocalLikes(prevLikes);
            setLocalDislikes(prevDislikes);
            setLocalUserVote(prevVote);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-700/30">
            {/* Username link */}
            <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-200 hover:text-white transition-colors px-1"
            >
                {username}
            </a>

            {/* Vote buttons container */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-purple-700/50 pl-1.5">
                {/* Like button */}
                <button
                    onClick={(e) => handleVote(e, 'like')}
                    disabled={isVoting}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-all ${localUserVote === 'like'
                            ? 'text-green-400 bg-green-900/40'
                            : 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Like"
                    aria-label={`Like ${username}`}
                >
                    <svg
                        className="w-3.5 h-3.5"
                        fill={localUserVote === 'like' ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                    </svg>
                    {localLikes > 0 && (
                        <span className="text-xs font-medium">{localLikes}</span>
                    )}
                </button>

                {/* Dislike button */}
                <button
                    onClick={(e) => handleVote(e, 'dislike')}
                    disabled={isVoting}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-all ${localUserVote === 'dislike'
                            ? 'text-red-400 bg-red-900/40'
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Dislike"
                    aria-label={`Dislike ${username}`}
                >
                    <svg
                        className="w-3.5 h-3.5"
                        fill={localUserVote === 'dislike' ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                        />
                    </svg>
                    {localDislikes > 0 && (
                        <span className="text-xs font-medium">{localDislikes}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
