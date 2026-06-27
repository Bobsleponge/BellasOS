'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CommandCenter } from '@/components/CommandCenter';
import { enableDeveloperMode, isDeveloperModeEnabled } from '@/lib/devMode';

function ConsoleGateInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get('dev') === '1') {
      enableDeveloperMode();
    }
    const allowed = isDeveloperModeEnabled(`?${params.toString()}`);
    if (!allowed) {
      router.replace('/');
    }
  }, [params, router]);

  if (!isDeveloperModeEnabled(`?${params.toString()}`)) {
    return (
      <div className="min-h-screen bg-panel flex items-center justify-center text-muted text-sm">
        Redirecting to home…
      </div>
    );
  }

  return <CommandCenter />;
}

export default function ConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-panel flex items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <ConsoleGateInner />
    </Suspense>
  );
}
