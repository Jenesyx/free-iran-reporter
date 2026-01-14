'use client';

import { useState, FormEvent } from 'react';
import { getValidationError, parseAndValidateHandle } from '@/lib/instagram';

interface InputSectionProps {
    onSubmitMultiple: (handles: string[]) => Promise<{ added: number; skipped: number; errors: string[] }>;
    existingHandles: string[];
}

export default function InputSection({ onSubmitMultiple, existingHandles }: InputSectionProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!input.trim()) {
            setError('Please enter an Instagram username or URL');
            return;
        }

        // Split by comma and clean up each part
        const parts = input.split(',').map(p => p.trim()).filter(p => p.length > 0);

        if (parts.length === 0) {
            setError('Please enter at least one Instagram username');
            return;
        }

        // Parse and validate all handles
        const validHandles: string[] = [];
        const errors: { part: string; error: string }[] = [];
        const duplicates: string[] = [];

        for (const part of parts) {
            // Get validation error (includes banned word checks)
            const validationError = getValidationError(part);
            if (validationError) {
                errors.push({ part, error: validationError });
                continue;
            }

            // Parse and normalize the handle
            const parsed = parseAndValidateHandle(part);
            if (!parsed) {
                errors.push({ part, error: 'Invalid Instagram username' });
                continue;
            }

            // Check for duplicates in existing handles (client-side)
            if (existingHandles.includes(parsed)) {
                duplicates.push(parsed);
                continue;
            }

            // Check for duplicates within the current input
            if (!validHandles.includes(parsed)) {
                validHandles.push(parsed);
            }
        }

        // If no valid handles, show appropriate error
        if (validHandles.length === 0) {
            if (errors.length > 0) {
                // Show the first validation error (could be "not allowed" or "English only")
                setError(errors[0].error);
            } else if (duplicates.length > 0) {
                setError('Already added.');
            } else {
                setError('No valid handles to submit');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await onSubmitMultiple(validHandles);

            if (result.added > 0) {
                setInput('');
                // Errors will be shown via toast in parent
            } else if (result.errors.length > 0) {
                setError(result.errors[0]);
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
                        placeholder="@username or URLs (comma-separated for multiple)"
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
