'use client';

import { useState, useEffect, useCallback } from 'react';
import Hero from '@/components/Hero';
import InputSection from '@/components/InputSection';
import HandleList from '@/components/HandleList';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Toast from '@/components/Toast';
import FeedbackSection from '@/components/FeedbackSection';
import Footer from '@/components/Footer';
import type { InstagramReport, HandleData, SortOption, VoteType } from '@/lib/types';
import { generateProfileUrl } from '@/lib/validation';
import { getFingerprint } from '@/lib/fingerprint';
import { saveVote, getAllUserVotes } from '@/lib/voteStorage';

export default function Home() {
  const [handles, setHandles] = useState<HandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Initialize fingerprint on mount
  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await getFingerprint();
      setFingerprint(fp);

      // Load local votes
      const localVotes = getAllUserVotes();
      setUserVotes(localVotes);
    };
    initFingerprint();
  }, []);

  // Fetch handles on mount and when sort changes
  const fetchHandles = useCallback(async (sort: SortOption) => {
    try {
      const response = await fetch(`/api/handles?sort=${sort}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setHandles(
          data.data?.map((r: InstagramReport & { likes?: number; dislikes?: number }) => ({
            id: r.id,
            username: r.username,
            profile_url: r.profile_url,
            likes: r.likes || 0,
            dislikes: r.dislikes || 0,
          })) || []
        );
      }
    } catch {
      setError('Failed to load handles. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user votes from server after fingerprint is ready
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (!fingerprint || handles.length === 0) return;

      try {
        // Use POST to avoid URL length issues with many handles
        const handleIds = handles.map(h => h.id);
        const response = await fetch('/api/votes/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint, handleIds }),
        });
        const data = await response.json();

        if (data.votes) {
          setUserVotes(prev => ({ ...prev, ...data.votes }));
        }
      } catch {
        // Silently fail - local votes will still work
        console.error('Failed to fetch user votes');
      }
    };

    fetchUserVotes();
  }, [fingerprint, handles.length]); // Only re-fetch when handles change

  useEffect(() => {
    fetchHandles(sortOption);
  }, [sortOption, fetchHandles]);

  // Handle sort change
  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortOption(newSort);
  }, []);


  // Handle vote
  const handleVote = useCallback(async (handleId: string, voteType: VoteType) => {
    if (!fingerprint) {
      setToast({ message: 'Unable to vote. Please refresh the page.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handleId, voteType, fingerprint }),
      });

      const data = await response.json();

      if (data.success) {
        // Save to local storage
        saveVote(handleId, voteType);

        // Update local state
        setUserVotes(prev => ({ ...prev, [handleId]: voteType }));

        // Update handle counts
        setHandles(prev => prev.map(h =>
          h.id === handleId
            ? { ...h, likes: data.likes, dislikes: data.dislikes }
            : h
        ));
      } else {
        throw new Error(data.error || 'Failed to vote');
      }
    } catch (err) {
      console.error('Vote error:', err);
      throw err; // Re-throw so HandlePill can revert optimistic update
    }
  }, [fingerprint]);

  // Handle multiple form submissions
  const handleSubmitMultiple = useCallback(async (usernamesToSubmit: string[]): Promise<{ added: number; skipped: number; errors: string[] }> => {
    const results = { added: 0, skipped: 0, errors: [] as string[] };
    const addedHandles: HandleData[] = [];

    for (const username of usernamesToSubmit) {
      try {
        const response = await fetch('/api/handles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: username }),
        });

        const data = await response.json();

        if (data.success && data.username) {
          // Active entry - add to list
          results.added++;
          addedHandles.push({
            id: data.id || `temp-${Date.now()}-${Math.random()}`,
            username: data.username,
            profile_url: generateProfileUrl(data.username),
            likes: 0,
            dislikes: 0,
          });
        } else if (data.success && data.message) {
          // Shadow-banned entry - count as added but don't show
          results.added++;
        } else if (data.error?.includes('Already added')) {
          results.skipped++;
        } else if (data.error?.includes('not found on Instagram')) {
          // Username doesn't exist - add to errors
          results.errors.push(data.error);
        } else {
          results.errors.push(data.error || 'Failed to submit');
        }
      } catch {
        results.errors.push('Network error');
      }
    }

    // Update state with all added handles (prepend for newest-first)
    if (addedHandles.length > 0) {
      if (sortOption === 'newest') {
        setHandles(prev => [...addedHandles, ...prev]);
      } else {
        // Re-fetch to get proper sort order
        fetchHandles(sortOption);
      }

      // Show appropriate toast message
      if (addedHandles.length === 1) {
        setToast({ message: 'Added!', type: 'success' });
      } else {
        setToast({ message: `Added ${addedHandles.length} usernames!`, type: 'success' });
      }
    } else if (results.errors.length > 0) {
      // No handles added but errors occurred - show error toast
      setToast({ message: results.errors[0], type: 'error' });
    }

    return results;
  }, [sortOption, fetchHandles]);

  // Handle copy success
  const handleCopySuccess = useCallback(() => {
    setToast({ message: 'Copied to clipboard!', type: 'success' });
  }, []);

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Hero />

        <InputSection
          onSubmitMultiple={handleSubmitMultiple}
          existingUsernames={handles.map(h => h.username)}
        />

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <HandleList
              handles={handles}
              onCopySuccess={handleCopySuccess}
              sortOption={sortOption}
              onSortChange={handleSortChange}
              userVotes={userVotes}
              onVote={handleVote}
            />

            {/* Community Feedback Section */}
            <FeedbackSection
              existingUsernames={handles.map(h => h.username)}
            />
          </>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Footer />
    </main>
  );
}
