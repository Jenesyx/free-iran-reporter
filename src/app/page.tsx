'use client';

import { useState, useEffect, useCallback } from 'react';
import Hero from '@/components/Hero';
import InputSection from '@/components/InputSection';
import HandleList from '@/components/HandleList';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Toast from '@/components/Toast';
import FeedbackSection from '@/components/FeedbackSection';
import Footer from '@/components/Footer';
import type { InstagramReport, HandleData, SortOption } from '@/lib/types';
import { generateProfileUrl } from '@/lib/validation';

export default function Home() {
  const [handles, setHandles] = useState<HandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Fetch handles on mount and when sort changes
  const fetchHandles = useCallback(async (sort: SortOption) => {
    try {
      const response = await fetch(`/api/handles?sort=${sort}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setHandles(
          data.data?.map((r: InstagramReport) => ({
            username: r.username,
            profile_url: r.profile_url,
          })) || []
        );
      }
    } catch {
      setError('Failed to load handles. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHandles(sortOption);
  }, [sortOption, fetchHandles]);

  // Handle sort change
  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortOption(newSort);
  }, []);

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
            username: data.username,
            profile_url: generateProfileUrl(data.username),
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
