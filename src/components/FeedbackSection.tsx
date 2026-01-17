'use client';

import { useState, useRef, useEffect } from 'react';

interface FeedbackSectionProps {
    existingUsernames: string[];
    onFeedbackSubmit?: () => void;
}

export default function FeedbackSection({ existingUsernames, onFeedbackSubmit }: FeedbackSectionProps) {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredUsernames, setFilteredUsernames] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Filter usernames for autocomplete
    useEffect(() => {
        if (username.length > 0) {
            const normalizedInput = username.toLowerCase().replace(/^@/, '');
            const filtered = existingUsernames
                .filter(u => u.toLowerCase().includes(normalizedInput))
                .slice(0, 8); // Limit to 8 suggestions
            setFilteredUsernames(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setFilteredUsernames([]);
            setShowSuggestions(false);
        }
    }, [username, existingUsernames]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectUsername = (selected: string) => {
        setUsername(selected);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

        const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();

        // Validate username exists
        if (!existingUsernames.map(u => u.toLowerCase()).includes(normalizedUsername)) {
            setFeedback({ type: 'error', text: 'Please select a username from the list' });
            return;
        }

        // Validate message
        if (message.trim().length < 10) {
            setFeedback({ type: 'error', text: 'Please write at least 10 characters' });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: normalizedUsername,
                    message: message.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setFeedback({ type: 'success', text: data.message || 'Thank you for your feedback!' });
                setUsername('');
                setMessage('');
                onFeedbackSubmit?.();
            } else {
                setFeedback({ type: 'error', text: data.error || 'Failed to submit feedback' });
            }
        } catch {
            setFeedback({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const exampleReasons = [
        'This person is wrongly listed',
        'This account is actually good',
        'Context is missing',
        'This account has changed',
    ];

    return (
        <section id="feedback-section" className="mt-12 mb-8">
            <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-700/40 rounded-xl p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-amber-100">
                            Community Feedback
                        </h2>
                        <p className="text-sm text-amber-200/60">
                            Help us correct mistakes or add context
                        </p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    If you notice an account that shouldn&apos;t be listed, is missing context, or has incorrect information,
                    please let us know. Your feedback helps keep this list accurate and fair.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Input with Autocomplete */}
                    <div className="relative">
                        <label htmlFor="feedback-username" className="block text-sm font-medium text-gray-300 mb-2">
                            Username to report
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                            <input
                                ref={inputRef}
                                id="feedback-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onFocus={() => username.length > 0 && setShowSuggestions(true)}
                                placeholder="Start typing to search..."
                                className="w-full pl-8 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                                autoComplete="off"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && (
                            <div
                                ref={suggestionsRef}
                                className="absolute z-10 w-full mt-1 bg-[#1f1f1f] border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                            >
                                {filteredUsernames.map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => selectUsername(u)}
                                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-amber-600/20 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        @{u}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Message Textarea */}
                    <div>
                        <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-300 mb-2">
                            Your feedback
                        </label>
                        <textarea
                            id="feedback-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Explain why this account should be reviewed..."
                            rows={4}
                            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors resize-none"
                            disabled={isSubmitting}
                            maxLength={1000}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">
                                Minimum 10 characters
                            </p>
                            <p className="text-xs text-gray-500">
                                {message.length}/1000
                            </p>
                        </div>
                    </div>

                    {/* Example Reasons */}
                    <div className="flex flex-wrap gap-2">
                        {exampleReasons.map((reason) => (
                            <button
                                key={reason}
                                type="button"
                                onClick={() => setMessage(reason)}
                                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors"
                                disabled={isSubmitting}
                            >
                                {reason}
                            </button>
                        ))}
                    </div>

                    {/* Feedback Message */}
                    {feedback && (
                        <div
                            className={`p-3 rounded-lg text-sm ${feedback.type === 'success'
                                ? 'bg-green-900/30 border border-green-700/50 text-green-400'
                                : 'bg-red-900/30 border border-red-700/50 text-red-400'
                                }`}
                        >
                            {feedback.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !username || message.length < 10}
                        className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                    />
                                </svg>
                                Submit Feedback
                            </>
                        )}
                    </button>
                </form>

                {/* Transparency Note */}
                <p className="mt-6 text-xs text-gray-500 text-center">
                    All feedback is public and permanent. We do not delete or edit submissions.
                </p>
            </div>
        </section>
    );
}
