import type { AITaskType, ModelDescriptor, ProviderType } from '@bellasos/contracts';

/** How much reasoning capacity a Jarvis turn needs. */
export type JarvisQueryTier = 'fast' | 'standard' | 'deep';

export interface JarvisRoutePlan {
  tier: JarvisQueryTier;
  taskType: AITaskType;
  maxTokens: number;
  temperature: number;
  model?: string;
}

export interface JarvisRouteOptions {
  pinModel?: string;
  forceTier?: JarvisQueryTier;
  isProviderConfigured?: (provider: ProviderType) => boolean;
}

const DEEP_KEYWORDS =
  /\b(research|analyze|analysis|compare|comparison|draft|write|brief|report|investigate|deep dive|comprehensive|strategy|architecture|implement|code|debug|refactor|explain in detail|pros and cons|step by step|whitepaper|thesis|summarize this|break down)\b/i;

const STANDARD_KEYWORDS =
  /\b(explain|why|how|describe|difference between|what are the|tell me about|overview|guide|help me understand)\b/i;

/** Classify a user message into a Jarvis tier without an extra LLM call. */
export function classifyJarvisQuery(message: string): JarvisQueryTier {
  const text = message.trim();
  if (!text) return 'fast';

  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;

  if (/^how (long|far|many|much|old|big|tall|wide|deep|fast|high)\b/i.test(lower) && words <= 22) {
    return 'fast';
  }

  if (DEEP_KEYWORDS.test(lower) || text.length > 220 || words > 45) {
    return 'deep';
  }

  if (
    STANDARD_KEYWORDS.test(lower) ||
    words > 18 ||
    text.length > 120 ||
    (text.includes('?') && words > 10)
  ) {
    return 'standard';
  }

  return 'fast';
}

function tierDefaults(tier: JarvisQueryTier): Pick<JarvisRoutePlan, 'taskType' | 'maxTokens' | 'temperature'> {
  switch (tier) {
    case 'deep':
      return { taskType: 'reasoning', maxTokens: 1024, temperature: 0.6 };
    case 'standard':
      return { taskType: 'general', maxTokens: 256, temperature: 0.5 };
    case 'fast':
    default:
      return { taskType: 'general', maxTokens: 120, temperature: 0.4 };
  }
}

function capabilityForTask(taskType: AITaskType): 'chat' | 'reasoning' {
  return taskType === 'reasoning' || taskType === 'research' || taskType === 'coding'
    ? 'reasoning'
    : 'chat';
}

/** Pick the best enabled model for a tier from the registry. */
export function selectModelForTier(
  tier: JarvisQueryTier,
  models: ModelDescriptor[],
  isProviderConfigured: (provider: ProviderType) => boolean = () => false,
): string | undefined {
  const defaults = tierDefaults(tier);
  const capability = capabilityForTask(defaults.taskType);

  let pool = models.filter(
    (m) => m.enabled && m.capabilities.includes(capability) && (m.local || isProviderConfigured(m.provider)),
  );
  if (pool.length === 0) {
    pool = models.filter(
      (m) => m.enabled && m.capabilities.includes('chat') && (m.local || isProviderConfigured(m.provider)),
    );
  }
  if (pool.length === 0) return undefined;

  const bySizeAsc = [...pool].sort(
    (a, b) => (a.paramsB ?? 999) - (b.paramsB ?? 999) || (a.latencyHint ?? 99) - (b.latencyHint ?? 99),
  );
  const bySizeDesc = [...bySizeAsc].reverse();

  if (tier === 'fast') {
    const local = bySizeAsc.filter((m) => m.local);
    return (local[0] ?? bySizeAsc[0])?.id;
  }

  if (tier === 'deep') {
    const reasoning = pool.filter((m) => m.capabilities.includes('reasoning'));
    const ranked = (reasoning.length > 0 ? reasoning : pool).sort(
      (a, b) => (b.paramsB ?? 0) - (a.paramsB ?? 0),
    );
    const preferCloud = process.env.JARVIS_PREFER_CLOUD_FOR_DEEP !== 'false';
    if (preferCloud) {
      const cloud = ranked.filter((m) => !m.local && isProviderConfigured(m.provider));
      if (cloud.length > 0) return cloud[0]?.id;
    }
    const local = ranked.filter((m) => m.local);
    return (local[0] ?? ranked[0])?.id;
  }

  const local = bySizeAsc.filter((m) => m.local);
  if (local.length > 0) {
    return local[Math.floor(local.length / 2)]?.id ?? local[0]?.id;
  }
  return bySizeAsc[0]?.id;
}

export type LocalModelHint = 'coding' | 'general' | 'vision';

/** Pick the best local (Ollama) model for execution after a cloud task brief. */
export function selectLocalModelForTier(
  tier: JarvisQueryTier,
  models: ModelDescriptor[],
  hint: LocalModelHint = 'general',
): string | undefined {
  const locals = models.filter((m) => m.enabled && m.local);
  if (locals.length === 0) return undefined;

  if (hint === 'coding') {
    const coder = locals.find((m) => /coder|code/i.test(m.id));
    if (coder) return coder.id;
  }
  if (hint === 'vision') {
    const vision = locals.find((m) => m.capabilities.includes('vision'));
    if (vision) return vision.id;
  }

  return selectModelForTier(tier, locals, () => false);
}

/**
 * Central Jarvis routing hub: classify the question, pick model + generation
 * settings, and return a plan for the AI gateway.
 */
export function planJarvisCompletion(
  message: string,
  models: ModelDescriptor[],
  options: JarvisRouteOptions = {},
): JarvisRoutePlan {
  const pin = options.pinModel?.trim() || process.env.JARVIS_MODEL?.trim();
  if (pin) {
    const tier = options.forceTier ?? classifyJarvisQuery(message);
    return { ...tierDefaults(tier), tier, model: pin };
  }

  const tier = options.forceTier ?? classifyJarvisQuery(message);
  const defaults = tierDefaults(tier);
  const configured = options.isProviderConfigured ?? (() => false);
  const model = selectModelForTier(tier, models, configured);

  return {
    tier,
    ...defaults,
    model,
  };
}
