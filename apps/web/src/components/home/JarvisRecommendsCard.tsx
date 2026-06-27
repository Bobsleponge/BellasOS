'use client';

import { useShellStore } from '@/stores/shellStore';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useJarvisSession } from '@/hooks/useJarvisSession';
import { homeSectionUrl } from '@/lib/missionRoutes';
import Link from 'next/link';

export function JarvisRecommendsCard() {
  const insights = useShellStore((s) => s.lastBriefingInsights);
  const { sendMessage } = useJarvisSession();
  const isLoading = insights == null;

  const nextAction = insights?.nextActions?.[0];
  const topRec = insights?.decisionRecommendations?.[0];
  const primary = nextAction
    ? {
        title: nextAction.label,
        detail: nextAction.rationale,
        decisionId: nextAction.decisionId,
        prompt: `Help me with this next action: ${nextAction.label}. ${nextAction.rationale}`,
      }
    : topRec
      ? {
          title: topRec.title,
          detail: topRec.nextAction ?? topRec.recommendedOption,
          decisionId: topRec.decisionId,
          prompt: `Help me decide: ${topRec.title}. Recommended: ${topRec.recommendedOption}. ${topRec.rationale}`,
        }
      : null;

  if (isLoading && !primary) {
    return <p className="text-sm text-muted">Loading recommendation…</p>;
  }

  if (!primary) {
    return (
      <p className="text-sm text-muted">
        No priority action right now. Check open decisions below or ask Jarvis.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-accent font-medium">
            Jarvis recommends
          </p>
          <p className="text-base font-semibold text-white mt-1">{primary.title}</p>
          <p className="text-sm text-white/70 mt-1">{primary.detail}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => void sendMessage(primary.prompt, 'text')}
            >
              Take action with Jarvis
            </Button>
            {primary.decisionId ? (
              <Link
                href={homeSectionUrl('decisions')}
                className="inline-flex items-center text-xs text-accent hover:underline h-7"
              >
                Open decision →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
