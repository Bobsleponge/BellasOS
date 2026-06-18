'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { consoleViewUrl, shellAppUrl } from '@/lib/navigation';

export function useConsoleNavigation() {
  const router = useRouter();

  const navigateToApp = useCallback(
    (appId: string, extra?: Record<string, string>) => {
      router.push(shellAppUrl(appId, extra));
    },
    [router],
  );

  const navigateToView = useCallback(
    (view: string) => {
      router.push(consoleViewUrl(view));
    },
    [router],
  );

  return { navigateToApp, navigateToView };
}
