'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBriefingBootstrap } from '@/hooks/useBriefingBootstrap';
import { HomeCommandDeck } from './HomeCommandDeck';
import { HomeDepthPanel } from './HomeDepthSection';
import { HOME_ROUTE, parseHomeSection } from '@/lib/missionRoutes';

function ExecutiveHomeInner() {
  useBriefingBootstrap();
  const params = useSearchParams();
  const section = parseHomeSection(params.get('section'));

  if (section !== 'overview') {
    return (
      <div className="pointer-events-auto w-full space-y-4 pb-4">
        <Link
          href={HOME_ROUTE}
          className="inline-flex text-sm text-accent hover:underline"
        >
          ← Back to overview
        </Link>
        <HomeDepthPanel section={section} />
      </div>
    );
  }

  return <HomeCommandDeck />;
}

export function ExecutiveHome() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading command deck…</div>}>
      <ExecutiveHomeInner />
    </Suspense>
  );
}
