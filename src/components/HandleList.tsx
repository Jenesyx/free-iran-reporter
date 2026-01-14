'use client';

import { useState } from 'react';
import HandlePill from './HandlePill';
import { formatHandle } from '@/lib/instagram';

interface HandleListProps {
    handles: string[];
    onCopySuccess: () => void;
}

export default function HandleList({ handles, onCopySuccess }: HandleListProps) {
    const [isCopying, setIsCopying] = useState(false);

    const handleCopyAll = async () => {
        if (handles.length === 0) return;

        const text = handles.map(h => formatHandle(h)).join('\n');

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
            {/* Header with counter and copy button */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-400 font-medium">
                    Total: {handles.length.toLocaleString()}
                </span>
                <button
                    onClick={handleCopyAll}
                    disabled={isCopying}
                    className="px-4 py-2 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-lg hover:bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] disabled:opacity-50 transition-colors"
                >
                    {isCopying ? 'Copied!' : 'Copy all'}
                </button>
            </div>

            {/* Pills container */}
            <div className="flex flex-wrap gap-2">
                {handles.map((handle) => (
                    <HandlePill key={handle} handle={handle} />
                ))}
            </div>
        </section>
    );
}
