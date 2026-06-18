'use client';

import { useEffect } from 'react';
import { useConsoleNavigation } from '@/hooks/useConsoleNavigation';
import { appIdToConsoleView } from '@/lib/navigation';

/** Legacy app window content — redirects to URL-synced console views. */
export function AppContent({ appId }: { appId: string }) {
  const { navigateToView } = useConsoleNavigation();

  useEffect(() => {
    navigateToView(appIdToConsoleView(appId));
  }, [appId, navigateToView]);

  return <p className="p-4 text-muted text-sm">Opening in Command Center…</p>;
}
