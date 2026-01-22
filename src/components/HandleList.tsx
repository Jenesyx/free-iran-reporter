'use client';

import { useState, useMemo } from 'react';
import HandlePill from './HandlePill';
import SortDropdown from './SortDropdown';
import type { HandleData, SortOption, VoteType } from '@/lib/types';

interface HandleListProps {
    handles: HandleData[];
    onCopySuccess: () => void;
    sortOption: SortOption;
    onSortChange: (sort: SortOption) => void;
    userVotes: Record<string, VoteType>;
    onVote: (handleId: string, voteType: VoteType) => Promise<void>;
}

export default function HandleList({
    handles,
    onCopySuccess,
    sortOption,
    onSortChange,
    userVotes,
    onVote
}: HandleListProps) {
    const [isCopying, setIsCopying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter handles based on search query
    const filteredHandles = useMemo(() => {
        if (!searchQuery.trim()) return handles;
        const query = searchQuery.toLowerCase().trim();
        return handles.filter(h => h.username.toLowerCase().includes(query));
    }, [handles, searchQuery]);

    const handleCopyAll = async () => {
        if (filteredHandles.length === 0) return;

        // Copy filtered usernames WITHOUT @ prefix, separated by space and newline
        const text = filteredHandles.map(h => h.username).join(' \n');

        try {
            await navigator.clipboard.writeText(text);
            setIsCopying(true);
            onCopySuccess();
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (handles.length === 0) {
        return (
            <section className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]/50 p-6 text-center">
                <p className="text-gray-500">No handles reported yet. Be the first to submit one!</p>
            </section>
        );
    }

    return (
        <section className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]/50 p-4 sm:p-6">
            {/* Search bar */}
            <div className="mb-4">
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search usernames..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#252525] border border-[#3a3a3a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            aria-label="Clear search"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Header with counter, sort dropdown, and action buttons */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium">
                        {searchQuery ? (
                            <>Showing: {filteredHandles.length.toLocaleString()} of {handles.length.toLocaleString()}</>
                        ) : (
                            <>Total: {handles.length.toLocaleString()}</>
                        )}
                    </span>
                    <SortDropdown value={sortOption} onChange={onSortChange} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const feedbackSection = document.getElementById('feedback-section');
                            if (feedbackSection) {
                                feedbackSection.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className="px-4 py-2 text-sm font-medium text-amber-300 bg-amber-900/50 rounded-lg hover:bg-amber-800/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Report
                    </button>
                    <button
                        onClick={handleCopyAll}
                        disabled={isCopying || filteredHandles.length === 0}
                        className="px-4 py-2 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-lg hover:bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] disabled:opacity-50 transition-colors"
                    >
                        {isCopying ? 'Copied!' : searchQuery ? 'Copy filtered' : 'Copy all'}
                    </button>
                </div>
            </div>

            {/* Pills container */}
            {filteredHandles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No usernames match &quot;{searchQuery}&quot;</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {filteredHandles.map((handle) => (
                        <HandlePill
                            key={handle.id}
                            id={handle.id}
                            username={handle.username}
                            profileUrl={handle.profile_url}
                            likes={handle.likes}
                            dislikes={handle.dislikes}
                            userVote={userVotes[handle.id] || null}
                            onVote={onVote}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
