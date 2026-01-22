'use client';

import { useState, FormEvent } from 'react';
import { getValidationError, parseAndValidateUsername } from '@/lib/instagram';
import { getInstagramProfileUrl } from '@/lib/instagramClientCheck';

interface InputSectionProps {
    onSubmitMultiple: (usernames: string[]) => Promise<{ added: number; skipped: number; errors: string[] }>;
    existingUsernames: string[];
}

interface PendingVerification {
    usernames: string[];
    windowRefs: (Window | null)[];
}

export default function InputSection({ onSubmitMultiple, existingUsernames }: InputSectionProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
    const [verificationStep, setVerificationStep] = useState<'input' | 'verifying'>('input');

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

        // Parse and validate all usernames
        const validUsernames: string[] = [];
        const errors: { part: string; error: string }[] = [];
        const duplicates: string[] = [];

        for (const part of parts) {
            // Get validation error (includes character checks)
            const validationError = getValidationError(part);
            if (validationError) {
                errors.push({ part, error: validationError });
                continue;
            }

            // Parse and normalize the username
            const parsed = parseAndValidateUsername(part);
            if (!parsed) {
                errors.push({ part, error: 'Invalid Instagram username' });
                continue;
            }

            // Check for duplicates in existing usernames (client-side)
            if (existingUsernames.includes(parsed)) {
                duplicates.push(parsed);
                continue;
            }

            // Check for duplicates within the current input
            if (!validUsernames.includes(parsed)) {
                validUsernames.push(parsed);
            }
        }

        // If no valid usernames, show appropriate error
        if (validUsernames.length === 0) {
            if (errors.length > 0) {
                // Show the first validation error (could be "not allowed" or "English only")
                setError(errors[0].error);
            } else if (duplicates.length > 0) {
                setError('Already added.');
            } else {
                setError('No valid usernames to submit');
            }
            return;
        }

        // Open Instagram profile(s) in new tab(s) for verification
        const windowRefs: (Window | null)[] = [];

        for (const username of validUsernames) {
            const profileUrl = getInstagramProfileUrl(username);
            const windowRef = window.open(profileUrl, '_blank', 'noopener,noreferrer');
            windowRefs.push(windowRef);

            // Small delay between opening tabs to prevent browser blocking
            if (validUsernames.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        // Store pending verification and switch to verification mode
        setPendingVerification({
            usernames: validUsernames,
            windowRefs
        });
        setVerificationStep('verifying');
    };

    const handleConfirmExists = async () => {
        if (!pendingVerification) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await onSubmitMultiple(pendingVerification.usernames);

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
            setPendingVerification(null);
            setVerificationStep('input');
        }
    };

    const handleCancelVerification = () => {
        // Close any opened windows
        if (pendingVerification) {
            for (const windowRef of pendingVerification.windowRefs) {
                if (windowRef && !windowRef.closed) {
                    try { windowRef.close(); } catch { /* ignore */ }
                }
            }
        }

        setPendingVerification(null);
        setVerificationStep('input');
        setError(null);
    };

    const handleProfileNotFound = () => {
        setPendingVerification(null);
        setVerificationStep('input');
        setError('Wrong ID - The Instagram profile does not exist.');
    };

    // Verification step UI
    if (verificationStep === 'verifying' && pendingVerification) {
        return (
            <section className="mb-8">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">Verify Profile</h3>
                            <p className="text-sm text-gray-400">
                                {pendingVerification.usernames.length === 1 ? (
                                    <>
                                        We opened the Instagram profile for <span className="text-purple-400 font-medium">@{pendingVerification.usernames[0]}</span> in a new tab.
                                    </>
                                ) : (
                                    <>
                                        We opened <span className="text-purple-400 font-medium">{pendingVerification.usernames.length} profiles</span> in new tabs.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <p className="text-gray-300 mb-4">
                        Does this profile exist on Instagram?
                    </p>

                    {/* Show usernames being verified */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {pendingVerification.usernames.map(username => (
                            <span
                                key={username}
                                className="px-3 py-1 bg-[#252525] border border-[#3a3a3a] rounded-full text-sm text-purple-300"
                            >
                                @{username}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleConfirmExists}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Yes, Add {pendingVerification.usernames.length === 1 ? 'it' : 'them'}
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleProfileNotFound}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600/80 text-white font-medium rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            No, Wrong ID
                        </button>

                        <button
                            onClick={handleCancelVerification}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 text-gray-400 hover:text-white font-medium rounded-lg hover:bg-[#252525] focus:outline-none transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // Default input UI
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
                        placeholder="username or URLs (comma-separated for multiple)"
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
