export type BriefingRhythm = 'morning' | 'midday' | 'evening' | 'night';

export function rhythmFromHour(hour: number): BriefingRhythm {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

export function currentRhythm(): BriefingRhythm {
  return rhythmFromHour(new Date().getHours());
}

export function applicationFromPathname(pathname: string, search = ''): string | undefined {
  if (pathname.startsWith('/finance')) return 'wealth';
  if (pathname.startsWith('/console')) {
    const params = new URLSearchParams(search);
    const view = params.get('view') ?? '';
    if (view.includes('bellasos.research')) return 'research';
    if (view.includes('bellasos.intelligence')) return 'intelligence';
    if (view.includes('bellasos.automation')) return 'automation';
    if (view.includes('bellasos.coding')) return 'coding-studio';
    if (view.includes('bellasos.social')) return 'communications';
  }
  return undefined;
}

export function inferModeFromApplication(application?: string): string | undefined {
  if (application === 'wealth') return 'wealth';
  if (application === 'research') return 'research';
  if (application === 'harvi-and-co' || application === 'truafrica') return 'business';
  if (application === 'coding-studio') return 'focus';
  return undefined;
}

const BRIEFING_KEY_PREFIX = 'bellasos:jarvis:lastBriefing';

export function readActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem('bellasos:activeWorkspaceId');
  } catch {
    return null;
  }
}

export function briefingStorageKey(rhythm: BriefingRhythm, workspaceId?: string | null): string {
  const date = new Date().toISOString().slice(0, 10);
  const ws = workspaceId ?? readActiveWorkspaceId() ?? '';
  return `${BRIEFING_KEY_PREFIX}:${rhythm}:${date}:${ws}`;
}

export function hasBriefingForRhythm(rhythm: BriefingRhythm): boolean {
  try {
    return localStorage.getItem(briefingStorageKey(rhythm)) === '1';
  } catch {
    return false;
  }
}

export function markBriefingDelivered(rhythm: BriefingRhythm): void {
  try {
    localStorage.setItem(briefingStorageKey(rhythm), '1');
  } catch {
    /* ignore */
  }
}
