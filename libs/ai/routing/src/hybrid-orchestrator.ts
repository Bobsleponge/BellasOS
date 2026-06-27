import type { AIGateway, CompletionRequest } from '@bellasos/contracts';
import type { JarvisQueryTier } from './jarvis-hub';
import {
  buildGuidePrompt,
  buildReviewPrompt,
  formatRefinePrompt,
  formatTaskBriefForPrompt,
  parseReviewResult,
  parseTaskBrief,
  type JarvisTaskBrief,
} from './jarvis-hybrid';
import { getHybridProfile, type HybridProfileConfig } from './hybrid-profile';

export interface HybridLeadResult {
  brief: JarvisTaskBrief;
  model: string;
  tokensUsed?: number;
}

export interface HybridReviewResult {
  passed: boolean;
  gaps: string[];
  model: string;
}

export interface HybridRunMeta {
  profile: string;
  leadModel: string;
  executeModel?: string;
  reviewModel?: string;
  synthesisModel?: string;
  reviewLoops: number;
  reviewPassed?: boolean;
  synthesized: boolean;
}

async function cloudComplete(
  ai: AIGateway,
  partial: Omit<CompletionRequest, 'messages'> & {
    messages: CompletionRequest['messages'];
  },
) {
  return ai.complete(partial);
}

export async function runHybridLead(
  ai: AIGateway,
  input: {
    message: string;
    traceId: string;
    tier?: JarvisQueryTier;
    historyBlock?: string;
    contextBlock?: string;
    profile?: HybridProfileConfig;
  },
): Promise<HybridLeadResult | null> {
  const profile = input.profile ?? getHybridProfile(input.tier);
  const guide = await cloudComplete(ai, {
    model: profile.leadModel,
    taskType: 'classification',
    maxTokens: profile.leadMaxTokens,
    temperature: 0.2,
    traceId: input.traceId,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior task lead. Output only valid JSON. Be thorough on deliverables, approach, and acceptance criteria.',
      },
      {
        role: 'user',
        content: buildGuidePrompt(input.message, {
          historyBlock: input.historyBlock,
          contextBlock: input.contextBlock,
          includeAcceptanceCriteria: profile.reviewEnabled,
        }),
      },
    ],
  });

  const brief = parseTaskBrief(guide.text);
  if (!brief) return null;

  return {
    brief,
    model: profile.leadModel,
    tokensUsed: guide.usage?.totalTokens,
  };
}

export async function runHybridReview(
  ai: AIGateway,
  input: {
    brief: JarvisTaskBrief;
    draft: string;
    traceId: string;
    tier?: JarvisQueryTier;
    profile?: HybridProfileConfig;
  },
): Promise<HybridReviewResult | null> {
  const profile = input.profile ?? getHybridProfile(input.tier);
  if (!profile.reviewEnabled || profile.reviewMaxTokens <= 0) {
    return { passed: true, gaps: [], model: profile.reviewModel };
  }

  const review = await cloudComplete(ai, {
    model: profile.reviewModel,
    taskType: 'classification',
    maxTokens: profile.reviewMaxTokens,
    temperature: 0.1,
    traceId: input.traceId,
    messages: [
      {
        role: 'system',
        content: 'You are a QA lead. Output only JSON. Be strict but fair.',
      },
      {
        role: 'user',
        content: buildReviewPrompt(input.brief, input.draft),
      },
    ],
  });

  const parsed = parseReviewResult(review.text);
  if (!parsed) {
    return { passed: true, gaps: [], model: profile.reviewModel };
  }

  return {
    passed: parsed.passed,
    gaps: parsed.gaps,
    model: profile.reviewModel,
  };
}

export async function runHybridRefine(
  ai: AIGateway,
  input: {
    executeBase: Omit<CompletionRequest, 'messages'>;
    systemPrompt: string;
    historyMessages: CompletionRequest['messages'];
    userContent: string;
    gaps: string[];
    draft: string;
    brief: JarvisTaskBrief;
    tier?: JarvisQueryTier;
    profile?: HybridProfileConfig;
  },
): Promise<{ text: string; model: string }> {
  const profile = input.profile ?? getHybridProfile(input.tier);
  const refine = await ai.complete({
    ...input.executeBase,
    maxTokens: Math.max(input.executeBase.maxTokens ?? 512, profile.refineMaxTokens),
    messages: [
      {
        role: 'system',
        content: `${input.systemPrompt}\n\n${formatTaskBriefForPrompt(input.brief)}\n\n${formatRefinePrompt(input.gaps)}`,
      },
      ...input.historyMessages,
      {
        role: 'user',
        content: `${input.userContent}\n\n---\nDraft to improve:\n${input.draft}`,
      },
    ],
  });

  return { text: refine.text.trim(), model: refine.model };
}

/** Light coherence pass — improves flow without replacing local substance. */
export async function runHybridSynthesis(
  ai: AIGateway,
  input: {
    brief: JarvisTaskBrief;
    draft: string;
    traceId: string;
    tier?: JarvisQueryTier;
    profile?: HybridProfileConfig;
  },
): Promise<{ text: string; model: string } | null> {
  const profile = input.profile ?? getHybridProfile(input.tier);
  if (!profile.synthesisEnabled || profile.synthesisMaxTokens <= 0) return null;
  if (input.tier && input.tier !== 'deep') return null;

  const synth = await cloudComplete(ai, {
    model: profile.synthesisModel,
    taskType: 'general',
    maxTokens: profile.synthesisMaxTokens,
    temperature: 0.35,
    traceId: input.traceId,
    messages: [
      {
        role: 'system',
        content:
          'You polish assistant replies for clarity and structure. Keep all facts and recommendations. ' +
          'Do not mention internal routing, models, or task briefs. Match the requested tone and length.',
      },
      {
        role: 'user',
        content: [
          `Objective: ${input.brief.objective}`,
          input.brief.constraints.length > 0
            ? `Constraints: ${input.brief.constraints.join('; ')}`
            : '',
          '',
          'Polish this draft (same substance, better delivery):',
          input.draft,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
  });

  const text = synth.text.trim();
  if (!text) return null;
  return { text, model: profile.synthesisModel };
}
