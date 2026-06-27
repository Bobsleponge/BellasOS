import type { JarvisBriefing } from './types';

interface CacheEntry {
  expiresAt: number;
  value: JarvisBriefing;
}

const BRIEFING_CACHE_TTL_MS = 5 * 60_000;
const briefingCache = new Map<string, CacheEntry>();

export function briefingCacheKey(parts: {
  userId: string;
  rhythm: string;
  application?: string;
  mode?: string;
  workspaceId?: string;
}): string {
  return [
    parts.userId,
    parts.rhythm,
    parts.application ?? '',
    parts.mode ?? '',
    parts.workspaceId ?? '',
  ].join(':');
}

export function getCachedBriefing(key: string): JarvisBriefing | null {
  const entry = briefingCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    briefingCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedBriefing(key: string, briefing: JarvisBriefing): void {
  briefingCache.set(key, {
    value: briefing,
    expiresAt: Date.now() + BRIEFING_CACHE_TTL_MS,
  });
}

export function invalidateBriefingCache(userId?: string): void {
  if (!userId) {
    briefingCache.clear();
    return;
  }
  for (const key of [...briefingCache.keys()]) {
    if (key.startsWith(`${userId}:`)) {
      briefingCache.delete(key);
    }
  }
}

export function invalidateAllBriefingCaches(): void {
  briefingCache.clear();
}
