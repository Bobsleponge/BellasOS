import type { CompletionRequest } from '@bellasos/contracts';
import {
  classifyJarvisQuery,
  formatTaskBriefForPrompt,
  getHybridProfile,
  getHybridProfileName,
  getJarvisHybridMode,
  planJarvisCompletion,
  runHybridLead,
  runHybridRefine,
  runHybridReview,
  runHybridSynthesis,
  selectLocalModelForTier,
  shouldLeadWithCloud,
  type HybridRunMeta,
  type JarvisTaskBrief,
} from '@bellasos/ai-routing';
import type { Platform } from './platform.token';

async function openAiConfigured(platform: Platform): Promise<boolean> {
  const key = await platform.config.getProviderCredential('openai');
  return Boolean(key?.trim());
}

export function jarvisExecuteRequest(
  platform: Platform,
  message: string,
  partial: Omit<CompletionRequest, 'messages' | 'model' | 'taskType' | 'maxTokens' | 'temperature'>,
  opts?: {
    forceTier?: 'fast' | 'standard' | 'deep';
    localModelHint?: 'coding' | 'general' | 'vision';
  },
): Omit<CompletionRequest, 'messages'> {
  const tier = opts?.forceTier ?? classifyJarvisQuery(message);
  const defaults = planJarvisCompletion(message, platform.ai.listModels(), {
    forceTier: tier,
    pinModel: process.env.JARVIS_MODEL,
  });

  const localModel =
    selectLocalModelForTier(tier, platform.ai.listModels(), opts?.localModelHint ?? 'general') ??
    defaults.model;

  return {
    taskType: defaults.taskType,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
    model: localModel,
    ...partial,
  };
}

export async function runHybridJarvisChat(
  platform: Platform,
  input: {
    message: string;
    traceId: string;
    historyBlock?: string;
    contextBlock?: string;
    systemPrompt: string;
    historyMessages: CompletionRequest['messages'];
    userContent: string;
  },
): Promise<{
  text: string;
  hybrid: boolean;
  brief?: JarvisTaskBrief;
  meta: HybridRunMeta;
} | null> {
  if (getJarvisHybridMode() !== 'openai-lead') return null;

  const tier = classifyJarvisQuery(input.message);
  if (!shouldLeadWithCloud(tier)) return null;
  if (!(await openAiConfigured(platform))) return null;

  const profile = getHybridProfile(tier);
  const lead = await runHybridLead(platform.ai, {
    message: input.message,
    traceId: input.traceId,
    tier,
    historyBlock: input.historyBlock,
    contextBlock: input.contextBlock,
    profile,
  });
  if (!lead) return null;

  const executeBase = jarvisExecuteRequest(
    platform,
    input.message,
    { traceId: input.traceId },
    { localModelHint: lead.brief.localModelHint, forceTier: tier },
  );

  const execute = await platform.ai.complete({
    ...executeBase,
    messages: [
      {
        role: 'system',
        content: `${input.systemPrompt}\n\n${formatTaskBriefForPrompt(lead.brief)}`,
      },
      ...input.historyMessages,
      { role: 'user', content: input.userContent },
    ],
  });

  let draft = execute.text.trim();
  let executeModel = execute.model;
  let reviewLoops = 0;
  let reviewPassed: boolean | undefined;

  if (profile.reviewEnabled && profile.maxReviewLoops > 0) {
    for (let i = 0; i < profile.maxReviewLoops; i++) {
      const review = await runHybridReview(platform.ai, {
        brief: lead.brief,
        draft,
        traceId: input.traceId,
        tier,
        profile,
      });
      if (!review) break;

      reviewPassed = review.passed;
      reviewLoops = i + 1;
      if (review.passed || review.gaps.length === 0) break;

      const refined = await runHybridRefine(platform.ai, {
        executeBase,
        systemPrompt: input.systemPrompt,
        historyMessages: input.historyMessages,
        userContent: input.userContent,
        gaps: review.gaps,
        draft,
        brief: lead.brief,
        tier,
        profile,
      });
      draft = refined.text;
      executeModel = refined.model;
    }
  }

  let synthesized = false;
  let synthesisModel: string | undefined;
  const synth = await runHybridSynthesis(platform.ai, {
    brief: lead.brief,
    draft,
    traceId: input.traceId,
    tier,
    profile,
  });
  if (synth) {
    draft = synth.text;
    synthesized = true;
    synthesisModel = synth.model;
  }

  return {
    text: draft,
    hybrid: true,
    brief: lead.brief,
    meta: {
      profile: getHybridProfileName(),
      leadModel: lead.model,
      executeModel,
      reviewModel: profile.reviewEnabled ? profile.reviewModel : undefined,
      synthesisModel,
      reviewLoops,
      reviewPassed,
      synthesized,
    },
  };
}

/** Cloud lead for intent JSON when hybrid mode is on. */
export async function hybridIntentAiRequest(
  platform: Platform,
  message: string,
  traceId: string,
): Promise<Omit<CompletionRequest, 'messages'> | null> {
  if (getJarvisHybridMode() !== 'openai-lead') return null;
  if (!(await openAiConfigured(platform))) return null;

  const tier = classifyJarvisQuery(message);
  const profile = getHybridProfile(tier);

  return {
    model: profile.leadModel,
    taskType: 'classification',
    maxTokens: Math.min(profile.leadMaxTokens, 400),
    temperature: 0.1,
    traceId,
  };
}
