'use client';

import { Suspense } from 'react';
import { AiView } from '@/components/AiView';
import { CommandCenter } from '@/components/CommandCenter';
import { ModuleDetailView } from '@/components/views';

export function AppContent({ appId }: { appId: string }) {
  if (appId === 'ai.studio') {
    return (
      <div className="p-4 overflow-auto h-full font-mono text-sm">
        <AiView />
      </div>
    );
  }
  if (appId === 'system.console') {
    return (
      <div className="h-full overflow-hidden font-mono text-sm">
        <Suspense fallback={<div className="p-4 text-muted">Loading console...</div>}>
          <CommandCenter embedded />
        </Suspense>
      </div>
    );
  }
  if (appId.startsWith('bellasos.')) {
    return (
      <div className="p-4 overflow-auto h-full font-mono text-sm">
        <ModuleDetailView moduleId={appId} />
      </div>
    );
  }
  return <div className="p-4 text-muted">Unknown app: {appId}</div>;
}
