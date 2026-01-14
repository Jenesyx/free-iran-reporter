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

  // Handle form submission
  const handleSubmit = useCallback(async (input: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const data = await response.json();

      if (data.success && data.handle) {
        // Optimistic update - add to beginning of list
        setHandles(prev => [data.handle, ...prev]);
        setToast({ message: 'Added!', type: 'success' });
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Failed to submit. Please try again.' };
    }
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
          onSubmit={handleSubmit}
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
