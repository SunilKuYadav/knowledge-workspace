'use client';

/**
 * AI availability context provider.
 *
 * Checks AI service connectivity on mount and polls every 30 seconds
 * to detect availability changes. Exposes status via useAIStatus() hook.
 *
 * Requirements: 6.1, 6.2, 6.4
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { installAIFetchLogger } from '@/src/ai/logger';

interface AIStatusContextValue {
  available: boolean;
}

const AIStatusContext = createContext<AIStatusContextValue>({ available: false });

const HEALTH_CHECK_INTERVAL_MS = 30_000;

export function AIProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // Install fetch logger for all AI API calls in the browser
    installAIFetchLogger();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        const res = await fetch('/api/ai/status');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setAvailable(data.available);
          }
        } else {
          if (mounted) setAvailable(false);
        }
      } catch {
        if (mounted) setAvailable(false);
      }
    }

    // Initial check on mount
    checkStatus();

    // Periodic health check every 30s
    const interval = setInterval(checkStatus, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <AIStatusContext.Provider value={{ available }}>
      {children}
    </AIStatusContext.Provider>
  );
}

/**
 * Hook to access AI availability status from context.
 */
export function useAIStatus(): AIStatusContextValue {
  return useContext(AIStatusContext);
}
