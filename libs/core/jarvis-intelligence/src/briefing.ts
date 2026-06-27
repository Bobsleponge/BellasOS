import type { DayPhase } from '@bellasos/contracts';
import {
  dayPhaseFromRhythm,
  greetingForRhythm,
} from './context';
import { formatOperatingModeForPrompt } from './operating-mode';
import { intelSignalsForNarrative, worldSignalsForNarrative } from './priority';
import { worldTrendOneLiner } from './world-strategic-intelligence';
import type {
  ComposeBriefingInput,
  IntelligenceSignal,
  JarvisBriefing,
} from './types';

function countAttentionItems(signals: IntelligenceSignal[]): number {
  return signals.filter(
    (s) =>
      s.kind === 'decision' ||
      s.kind === 'blocker' ||
      s.tier === 'immediate' ||
      s.source.startsWith('approval'),
  ).length;
}

function pickSentences(signals: IntelligenceSignal[], max: number): string[] {
  const lines: string[] = [];
  for (const s of signals) {
    if (lines.length >= max) break;
    const goalLine = s.goalImpact?.[0]?.relevanceLine;
    const detail = goalLine ?? s.relevanceLine ?? s.summary;
    if (s.kind === 'decision') {
      lines.push(`${s.title.replace(/^Approval needed: /, 'You have a decision: ')} — ${detail}.`);
    } else if (s.kind === 'risk') {
      lines.push(`${s.title}: ${detail}.`);
    } else if (s.kind === 'opportunity') {
      lines.push(`${s.summary}${goalLine ? ` ${goalLine}` : ''}.`);
    } else if (s.kind === 'follow_up') {
      lines.push(`${s.title} is ready for review.`);
    } else if (goalLine) {
      lines.push(`${s.title}. ${goalLine}.`);
    } else {
      lines.push(`${s.title} — ${detail}.`);
    }
  }
  return lines;
}

function workspaceProgressLines(
  input: ComposeBriefingInput,
  max: number,
): string[] {
  const progress = input.workspaceProgress;
  if (!progress) return [];
  return [progress.headline].slice(0, max);
}

function goalProgressLines(
  input: ComposeBriefingInput,
  max: number,
): string[] {
  const summaries = input.goalProgress ?? [];
  return summaries.slice(0, max).map((g) => g.headline);
}

function decisionRecommendationLines(
  input: ComposeBriefingInput,
  max: number,
): string[] {
  const recs = input.decisionRecommendations ?? [];
  return recs.slice(0, max).map((r) => {
    const action = r.nextAction ? ` Consider: ${r.nextAction}.` : '';
    return `${r.title} — ${r.tradeoffLine}${action}`;
  });
}

function nextActionLine(input: ComposeBriefingInput): string | undefined {
  const top = input.nextActions?.[0];
  if (!top || top.confidence < 0.6) return undefined;
  return `What you might do next: ${top.label}.`;
}

export function buildBriefingSkeleton(
  rhythm: ComposeBriefingInput['rhythm'],
  signals: IntelligenceSignal[],
  userDisplayName?: string,
  input?: ComposeBriefingInput,
): { greeting: string; narrative: string; offerDepth: string; phase: DayPhase } {
  const greeting = greetingForRhythm(rhythm, userDisplayName);
  const phase = dayPhaseFromRhythm(rhythm);
  const attention = countAttentionItems(signals);
  const intel = intelSignalsForNarrative(signals, 3);
  const worldItems = worldSignalsForNarrative(signals, rhythm === 'morning' ? 3 : 2);
  const worldTrendLine = worldTrendOneLiner(input?.worldTrends ?? []);
  const decisions = signals.filter((s) => s.kind === 'decision');
  const wealth = signals.find((s) => s.applicationId === 'wealth' && s.source.includes('summary'));
  const parts: string[] = [];

  if (rhythm === 'morning') {
    if (attention > 0) {
      parts.push(
        `${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} your attention today.`,
      );
    } else if (signals.length > 0) {
      parts.push('Here is what is on your radar today.');
    } else {
      parts.push('You are caught up — a calm start.');
    }
    parts.push(...pickSentences(decisions, 2));
    parts.push(...workspaceProgressLines(input ?? { signals } as ComposeBriefingInput, 1));
    parts.push(...goalProgressLines(input ?? { signals } as ComposeBriefingInput, 2));
    parts.push(...decisionRecommendationLines(input ?? { signals } as ComposeBriefingInput, 2));
    if (worldItems.length > 0) {
      parts.push('World pulse —');
      parts.push(...pickSentences(worldItems, 2));
    }
    if (worldTrendLine) parts.push(worldTrendLine + '.');
    parts.push(...pickSentences(intel, 2));
    if (wealth) parts.push(wealth.summary + '.');
    const next = nextActionLine(input ?? { signals } as ComposeBriefingInput);
    if (next) parts.push(next);
  } else if (rhythm === 'midday') {
    parts.push('Since this morning, here is what changed.');
    const immediate = signals.filter((s) => s.tier === 'immediate');
    const worldDelta = worldSignalsForNarrative(signals, 2);
    if (immediate.length === 0 && worldDelta.length === 0) {
      parts.push('Nothing urgent — you are on track.');
    } else {
      parts.push(...pickSentences(immediate, 2));
      if (worldDelta.length > 0) {
        parts.push(...pickSentences(worldDelta, 2));
      }
      parts.push(...goalProgressLines(input ?? { signals } as ComposeBriefingInput, 1));
      parts.push(...decisionRecommendationLines(input ?? { signals } as ComposeBriefingInput, 1));
    }
  } else if (rhythm === 'evening') {
    parts.push('Wrapping up the day.');
    if (decisions.length > 0) {
      parts.push(`${decisions.length} decision${decisions.length === 1 ? '' : 's'} still open.`);
    }
    const openCount = input?.openDecisions?.length ?? 0;
    if (openCount > 0) {
      parts.push(`${openCount} strategic decision${openCount === 1 ? '' : 's'} awaiting your choice.`);
    }
    const behind = (input?.goalProgress ?? []).filter((g) => !g.onTrack);
    if (behind.length > 0) {
      parts.push(`${behind.length} goal${behind.length === 1 ? '' : 's'} need attention before tomorrow.`);
    }
    if (worldTrendLine) {
      parts.push(`External trends: ${worldTrendLine}.`);
    }
    const activity = signals.filter((s) => s.source.startsWith('audit') || s.kind === 'follow_up');
    if (activity.length > 0) {
      parts.push(...pickSentences(activity.slice(0, 2), 2));
    } else {
      parts.push('No major loose ends from today.');
    }
  } else {
    parts.push('Quiet hours — I will only interrupt for critical items.');
    parts.push(...pickSentences(signals.filter((s) => s.tier === 'immediate'), 1));
  }

  const narrative = parts.join(' ');
  const offerDepth =
    rhythm === 'night'
      ? ''
      : 'Would you like a deeper briefing?';

  return { greeting, narrative, offerDepth, phase };
}

export async function composeBriefing(
  input: ComposeBriefingInput,
): Promise<JarvisBriefing> {
  const now = new Date().toISOString();
  const skeleton = buildBriefingSkeleton(
    input.rhythm,
    input.signals,
    input.userDisplayName,
    input,
  );

  const highlights = input.signals
    .filter((s) => s.tier === 'immediate' || s.tier === 'briefing')
    .slice(0, 5);

  let narrative = skeleton.narrative;
  const shouldPolish =
    input.deep || input.rhythm === 'morning' || highlights.length > 0;

  if (shouldPolish && input.signals.length > 0) {
    try {
      const signalBrief = highlights.map((s) => ({
        title: s.title,
        summary: s.summary,
        kind: s.kind,
        relevance: s.relevanceLine,
        goalImpact: s.goalImpact,
        worldRelevance: s.worldRelevance,
        worldOpportunity: s.worldOpportunity,
      }));

      const completion = await input.platform.ai.complete({
        taskType: input.deep ? 'reasoning' : 'fast',
        traceId: input.ctx.traceId,
        temperature: 0.4,
        maxTokens: input.deep ? 400 : 220,
        messages: [
          {
            role: 'system',
            content:
              'You are Jarvis, BellasOS executive assistant. Write a calm, human briefing in 3-6 sentences. ' +
              'Structure: internal priorities first, then world pulse (external), then combined impact on goals and decisions. ' +
              'For each key event explain: what happened, why it matters, which goal it impacts, what to consider doing next, and one recommended action when impact is not neutral. ' +
              'When worldRelevance is present, connect external developments to internal goals or open decisions. ' +
              'Frame external items as "pattern worth noting" — never alarmist. Max 2 world lines at midday, max 3 in morning deep brief. ' +
              'Include decision tradeoffs when decisionRecommendations are present. ' +
              'No bullet lists, no JSON, no dashboard language. Be specific and actionable. ' +
              'Address the user naturally. End with a brief offer to go deeper if appropriate.',
          },
          {
            role: 'user',
            content:
              `Rhythm: ${input.rhythm}. ${formatOperatingModeForPrompt(input.contextStack.operatingMode)} ` +
              `Active application domain: ${input.contextStack.domain.primary}. ` +
              `User: ${input.userDisplayName ?? 'there'}. ` +
              `Goal progress: ${JSON.stringify(input.goalProgress ?? [])}. ` +
              `Workspace progress: ${JSON.stringify(input.workspaceProgress ?? null)}. ` +
              `Decision recommendations: ${JSON.stringify(input.decisionRecommendations ?? [])}. ` +
              `World pulse: ${JSON.stringify(input.worldPulse ?? [])}. ` +
              `World trends: ${JSON.stringify(input.worldTrends ?? [])}. ` +
              `External highlights: ${JSON.stringify((input.externalHighlights ?? []).map((s) => ({ title: s.title, relevance: s.worldRelevance?.relevanceLine ?? s.relevanceLine })))}. ` +
              `Next actions: ${JSON.stringify(input.nextActions ?? [])}. ` +
              `Skeleton: ${skeleton.narrative}. ` +
              `Signals: ${JSON.stringify(signalBrief)}`,
          },
        ],
      });

      const polished = completion.text.trim();
      if (polished.length > 40 && polished.length < 900) {
        narrative = polished;
      }
    } catch {
      /* use skeleton */
    }
  }

  const fullNarrative = skeleton.offerDepth
    ? `${narrative} ${skeleton.offerDepth}`.trim()
    : narrative;

  return {
    rhythm: input.rhythm,
    phase: skeleton.phase,
    greeting: skeleton.greeting,
    narrative: fullNarrative,
    offerDepth: skeleton.offerDepth,
    highlights,
    contextStack: input.contextStack,
    generatedAt: now,
    strategicInsights: input.strategicInsights ?? [],
    goalProgress: input.goalProgress ?? [],
    decisionRecommendations: input.decisionRecommendations ?? [],
    openDecisions: input.openDecisions ?? [],
    nextActions: input.nextActions ?? [],
    worldPulse: input.worldPulse ?? [],
    worldTrends: input.worldTrends ?? [],
    externalHighlights: input.externalHighlights ?? [],
    workspaceProgress: input.workspaceProgress,
  };
}

export function briefingToTranscript(briefing: JarvisBriefing): string {
  return `${briefing.greeting} ${briefing.narrative}`.trim();
}

export function looksLikeBriefingRequest(message: string): {
  match: boolean;
  deep: boolean;
} {
  const m = message.toLowerCase().trim();
  const deep =
    /\b(deeper|detailed|full|expand)\b/.test(m) &&
    /\b(brief|briefing|today|update)\b/.test(m);
  const match =
    /^(brief me|what'?s on today|morning briefing|daily briefing|give me (a |my )?briefing|end of day|evening summary|midday check)/.test(
      m,
    ) ||
    /\b(brief me|what is on today|deeper briefing)\b/.test(m);
  return { match, deep };
}
