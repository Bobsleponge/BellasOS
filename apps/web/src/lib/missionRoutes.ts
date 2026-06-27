import type { TodayItemKind } from '@/lib/api';
import { INTELLIGENCE_APP_URL, WEALTH_APP_URL } from '@bellasos/contracts';

/** Primary user home — merged Today + Mission Control. */
export const HOME_ROUTE = '/';

/** @deprecated Use HOME_ROUTE; kept for backward-compatible imports. */
export const MISSION_CONTROL_ROUTE = HOME_ROUTE;

export type HomeSection =
  | 'overview'
  | 'workspaces'
  | 'goals'
  | 'decisions'
  | 'intelligence'
  | 'memory';

/** @deprecated Use HomeSection */
export type MissionTab = HomeSection;

export const HOME_SECTIONS: Array<{ key: HomeSection; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'workspaces', label: 'Workspaces' },
  { key: 'goals', label: 'Goals' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'intelligence', label: 'Intelligence' },
  { key: 'memory', label: 'Memory' },
];

/** @deprecated Use HOME_SECTIONS */
export const MISSION_TABS = HOME_SECTIONS;

export function homeSectionUrl(section: HomeSection, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ section });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return `${HOME_ROUTE}?${params.toString()}`;
}

/** @deprecated Use homeSectionUrl */
export function missionTabUrl(tab: HomeSection, extra?: Record<string, string>): string {
  return homeSectionUrl(tab, extra);
}

export function parseHomeSection(value: string | null): HomeSection {
  const sections: HomeSection[] = [
    'overview',
    'workspaces',
    'goals',
    'decisions',
    'intelligence',
    'memory',
  ];
  if (value && sections.includes(value as HomeSection)) return value as HomeSection;
  return 'overview';
}

/** @deprecated Use parseHomeSection */
export function parseMissionTab(value: string | null): HomeSection {
  return parseHomeSection(value);
}

/** Legacy /mission?tab= → home section */
export function legacyMissionRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  if (tab) {
    params.delete('tab');
    params.set('section', tab);
  }
  const qs = params.toString();
  return qs ? `${HOME_ROUTE}?${qs}` : HOME_ROUTE;
}

const KIND_APP: Partial<Record<TodayItemKind, string>> = {
  wealth: WEALTH_APP_URL,
  intelligence: INTELLIGENCE_APP_URL,
  world: INTELLIGENCE_APP_URL,
};

const KIND_SECTION: Partial<Record<TodayItemKind, HomeSection>> = {
  goal: 'goals',
  decision: 'decisions',
  world: 'intelligence',
  workspace: 'workspaces',
  intelligence: 'intelligence',
};

export function todayItemMissionHref(kind: TodayItemKind, id?: string): string | undefined {
  const appUrl = KIND_APP[kind];
  if (appUrl) return appUrl;

  const section = KIND_SECTION[kind];
  if (!section) return undefined;
  if (kind === 'workspace' && id?.startsWith('workspace:')) {
    return homeSectionUrl('workspaces', { workspace: id.replace('workspace:', '') });
  }
  return homeSectionUrl(section);
}
