'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { currentRhythm } from '@/lib/jarvisRhythm';
import { briefingQueryKey } from '@/lib/operatingMode';
import { useShellStore } from '@/stores/shellStore';

/** Loads Jarvis briefing intelligence on home mount — independent of voice session. */
export function useBriefingBootstrap() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const operatingMode = useShellStore((s) => s.operatingMode);
  const setLastBriefingInsights = useShellStore((s) => s.setLastBriefingInsights);
  const hydrated = useRef(false);

  const query = useQuery({
    queryKey: briefingQueryKey(activeWorkspaceId),
    queryFn: () =>
      api.jarvisBriefing({
        rhythm: currentRhythm(),
        mode: operatingMode,
        workspaceId: activeWorkspaceId ?? undefined,
        persist: false,
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!query.data || hydrated.current) return;
    hydrated.current = true;
    const briefing = query.data;
    setLastBriefingInsights({
      goalProgress: briefing.goalProgress ?? briefing.briefing?.goalProgress,
      decisionRecommendations:
        briefing.decisionRecommendations ?? briefing.briefing?.decisionRecommendations,
      worldPulse: briefing.worldPulse ?? briefing.briefing?.worldPulse,
      strategicInsights: briefing.strategicInsights ?? briefing.briefing?.strategicInsights,
      nextActions: briefing.nextActions ?? briefing.briefing?.nextActions,
    });
  }, [query.data, setLastBriefingInsights]);

  useEffect(() => {
    hydrated.current = false;
  }, [activeWorkspaceId, operatingMode]);

  return query;
}
