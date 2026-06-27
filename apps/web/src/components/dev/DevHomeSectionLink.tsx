'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '@/components/Panel';
import { api } from '@/lib/api';
import { homeSectionUrl, type HomeSection } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';

export function DevHomeSectionLink({
  section,
  label,
}: {
  section: HomeSection;
  label: string;
}) {
  return (
    <Panel title={label} subtitle="moved to executive home">
      <p className="text-sm text-muted mb-4">
        {label} is part of Mission Control on the home surface. Developer Mode keeps
        technical operations here; strategic views live at home.
      </p>
      <Link href={homeSectionUrl(section)} className="text-sm text-accent hover:underline">
        Open {label} on home →
      </Link>
    </Panel>
  );
}
