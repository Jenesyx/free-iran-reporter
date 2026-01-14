'use client';

import { useState, FormEvent } from 'react';
import { getValidationError, parseInstagramHandle } from '@/lib/instagram';

interface InputSectionProps {
    onSubmit: (handle: string) => Promise<{ success: boolean; error?: string }>;
    existingHandles: string[];
}

export default function InputSection({ onSubmit, existingHandles }: InputSectionProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        const validationError = getValidationError(input);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Check for duplicates client-side
        const parsed = parseInstagramHandle(input);
        if (parsed && existingHandles.includes(parsed)) {
            setError('This handle has already been reported');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await onSubmit(input);
            if (result.success) {
                setInput('');
            } else {
                setError(result.error || 'Failed to submit');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="mb-8">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="Paste Instagram profile link or @username"
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-white placeholder-gray-500"
                        disabled={isSubmitting}
                    />
                    {error && (
                        <p className="mt-2 text-sm text-red-400">{error}</p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? '...' : 'OK'}
                </button>
            </form>
        </section>
    );
}
