import {
  classifyJarvisQuery,
  getHybridProfile,
  getJarvisHybridMode,
} from '@bellasos/ai-routing';
import { buildExecutionPlanPrompt } from './prompt';
import { parseExecutionPlan } from './parse';
import { enrichExecutionPlanFromPlaybooks, buildPlaybookFallbackPlan } from './playbook-enrich';
import type { CognitionPlatform, JarvisExecutionPlan } from './types';
import { buildHeuristicPlan } from './heuristic-plan';

export async function openAiConfigured(platform: CognitionPlatform): Promise<boolean> {
  if (!platform.config?.getProviderCredential) return false;
  const key = await platform.config.getProviderCredential('openai');
  return Boolean(key?.trim());
}

export function cognitionEnabled(): boolean {
  return getJarvisHybridMode() === 'openai-lead';
}

export async function runExecutionPlanLead(
  platform: CognitionPlatform,
  input: {
    message: string;
    traceId: string;
    historyBlock?: string;
    contextBlock?: string;
    pendingSummary?: string;
  },
): Promise<JarvisExecutionPlan | null> {
  if (!cognitionEnabled()) {
    const fallback = buildHeuristicPlan(input.message) ?? buildPlaybookFallbackPlan(input.message);
    return fallback ? enrichExecutionPlanFromPlaybooks(fallback, input.message) : null;
  }

  const tier = classifyJarvisQuery(input.message);
  const profile = getHybridProfile(tier);
  if (!(await openAiConfigured(platform))) {
    const fallback = buildHeuristicPlan(input.message) ?? buildPlaybookFallbackPlan(input.message);
    return fallback ? enrichExecutionPlanFromPlaybooks(fallback, input.message) : null;
  }

  const leadModel = tier === 'deep' && profile.deepLeadModel ? profile.deepLeadModel : profile.leadModel;

  const guide = await platform.ai.complete({
    model: leadModel,
    taskType: 'classification',
    maxTokens: Math.max(profile.leadMaxTokens, 800),
    temperature: 0.15,
    traceId: input.traceId,
    messages: [
      {
        role: 'system',
        content:
          'You are Jarvis cognition lead for BellasOS. Output only valid JSON execution plans. Be precise on queryKind and contextFetches.',
      },
      {
        role: 'user',
        content: buildExecutionPlanPrompt(input),
      },
    ],
  });

  const parsed = parseExecutionPlan(guide.text);
  if (parsed) return enrichExecutionPlanFromPlaybooks(parsed, input.message);
  const fallback = buildHeuristicPlan(input.message) ?? buildPlaybookFallbackPlan(input.message);
  return fallback ? enrichExecutionPlanFromPlaybooks(fallback, input.message) : null;
}
