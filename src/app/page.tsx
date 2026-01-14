'use client';

import { useState, useEffect, useCallback } from 'react';
import Hero from '@/components/Hero';
import InputSection from '@/components/InputSection';
import HandleList from '@/components/HandleList';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Toast from '@/components/Toast';
import type { InstagramReport } from '@/lib/types';

export default function Home() {
  const [handles, setHandles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch handles on mount
  useEffect(() => {
    const fetchHandles = async () => {
      try {
        const response = await fetch('/api/handles');
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setHandles(data.data?.map((r: InstagramReport) => r.handle) || []);
        }
      } catch {
        setError('Failed to load handles. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHandles();
  }, []);

  // Handle multiple form submissions
  const handleSubmitMultiple = useCallback(async (handlesToSubmit: string[]): Promise<{ added: number; skipped: number; errors: string[] }> => {
    const results = { added: 0, skipped: 0, errors: [] as string[] };
    const addedHandles: string[] = [];

    for (const handle of handlesToSubmit) {
      try {
        const response = await fetch('/api/handles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: handle }),
        });

        const data = await response.json();

        if (data.success && data.handle) {
          results.added++;
          addedHandles.push(data.handle);
        } else if (data.error?.includes('already been reported')) {
          results.skipped++;
        } else {
          results.errors.push(data.error || 'Failed to submit');
        }
      } catch {
        results.errors.push('Network error');
      }
    }

    // Update state with all added handles
    if (addedHandles.length > 0) {
      setHandles(prev => [...addedHandles, ...prev]);

      // Show appropriate toast message
      if (addedHandles.length === 1) {
        setToast({ message: 'Added!', type: 'success' });
      } else {
        setToast({ message: `Added ${addedHandles.length} handles!`, type: 'success' });
      }
    }

    return results;
  }, []);

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
          existingHandles={handles}
        />

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <HandleList
            handles={handles}
            onCopySuccess={handleCopySuccess}
          />
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
    </main>
  );
}
