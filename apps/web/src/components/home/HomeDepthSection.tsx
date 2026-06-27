'use client';

import { DecisionsTab } from '@/components/mission/DecisionsTab';
import { GoalsTab } from '@/components/mission/GoalsTab';
import { IntelligenceTab } from '@/components/mission/IntelligenceTab';
import { MemoryTab } from '@/components/mission/MemoryTab';
import { WorkspacesTab } from '@/components/mission/WorkspacesTab';
import type { HomeSection } from '@/lib/missionRoutes';

export function HomeDepthPanel({ section }: { section: HomeSection }) {
  switch (section) {
    case 'workspaces':
      return <WorkspacesTab />;
    case 'goals':
      return <GoalsTab />;
    case 'decisions':
      return <DecisionsTab />;
    case 'intelligence':
      return <IntelligenceTab />;
    case 'memory':
      return <MemoryTab />;
    default:
      return null;
  }
}
