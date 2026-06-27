import type { JarvisQueryTier } from './jarvis-hub';

/** Spend/involvement preset for OpenAI lead + review phases. */
export type HybridProfileName = 'economy' | 'balanced' | 'premium';

export interface HybridProfileConfig {
  leadModel: string;
  reviewModel: string;
  synthesisModel: string;
  leadMaxTokens: number;
  reviewMaxTokens: number;
  refineMaxTokens: number;
  synthesisMaxTokens: number;
  reviewEnabled: boolean;
  maxReviewLoops: number;
  /** When true, even fast-tier Jarvis turns get a cloud lead brief. */
  leadFastTier: boolean;
  /** Stronger lead model for deep / high-stakes turns. */
  deepLeadModel: string;
  /** Light OpenAI coherence pass after local execution (deep tier). */
  synthesisEnabled: boolean;
}

const PROFILES: Record<HybridProfileName, HybridProfileConfig> = {
  economy: {
    leadModel: 'gpt-4o-mini',
    reviewModel: 'gpt-4o-mini',
    synthesisModel: 'gpt-4o-mini',
    leadMaxTokens: 220,
    reviewMaxTokens: 0,
    refineMaxTokens: 0,
    synthesisMaxTokens: 0,
    reviewEnabled: false,
    maxReviewLoops: 0,
    leadFastTier: true,
    deepLeadModel: 'gpt-4o-mini',
    synthesisEnabled: false,
  },
  balanced: {
    leadModel: 'gpt-4o-mini',
    reviewModel: 'gpt-4o-mini',
    synthesisModel: 'gpt-4o-mini',
    leadMaxTokens: 600,
    reviewMaxTokens: 400,
    refineMaxTokens: 512,
    synthesisMaxTokens: 0,
    reviewEnabled: true,
    maxReviewLoops: 1,
    leadFastTier: true,
    deepLeadModel: 'gpt-4o',
    synthesisEnabled: false,
  },
  premium: {
    leadModel: 'gpt-4o',
    reviewModel: 'gpt-4o',
    synthesisModel: 'gpt-4o-mini',
    leadMaxTokens: 1200,
    reviewMaxTokens: 800,
    refineMaxTokens: 1024,
    synthesisMaxTokens: 1500,
    reviewEnabled: true,
    maxReviewLoops: 2,
    leadFastTier: true,
    deepLeadModel: 'gpt-4o',
    synthesisEnabled: true,
  },
};

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

function parseIntBounded(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function getHybridProfileName(): HybridProfileName {
  const raw = (process.env.HYBRID_PROFILE ?? 'premium').trim().toLowerCase();
  if (raw === 'economy' || raw === 'balanced' || raw === 'premium') return raw;
  return 'premium';
}

/** Resolved hybrid spend profile with optional per-env overrides. */
export function getHybridProfile(tier?: JarvisQueryTier): HybridProfileConfig {
  const base = { ...PROFILES[getHybridProfileName()] };

  if (process.env.JARVIS_GUIDE_MODEL?.trim()) {
    base.leadModel = process.env.JARVIS_GUIDE_MODEL.trim();
  }
  if (process.env.HYBRID_REVIEW_MODEL?.trim()) {
    base.reviewModel = process.env.HYBRID_REVIEW_MODEL.trim();
  }
  if (process.env.HYBRID_SYNTHESIS_MODEL?.trim()) {
    base.synthesisModel = process.env.HYBRID_SYNTHESIS_MODEL.trim();
  }
  if (process.env.HYBRID_DEEP_LEAD_MODEL?.trim()) {
    base.deepLeadModel = process.env.HYBRID_DEEP_LEAD_MODEL.trim();
  }

  base.leadMaxTokens = parseIntBounded(
    process.env.JARVIS_GUIDE_MAX_TOKENS ?? process.env.HYBRID_LEAD_MAX_TOKENS,
    base.leadMaxTokens,
    80,
    4000,
  );
  base.reviewMaxTokens = parseIntBounded(
    process.env.HYBRID_REVIEW_MAX_TOKENS,
    base.reviewMaxTokens,
    0,
    2000,
  );
  base.refineMaxTokens = parseIntBounded(
    process.env.HYBRID_REFINE_MAX_TOKENS,
    base.refineMaxTokens,
    0,
    4096,
  );
  base.synthesisMaxTokens = parseIntBounded(
    process.env.HYBRID_SYNTHESIS_MAX_TOKENS,
    base.synthesisMaxTokens,
    0,
    4096,
  );
  base.maxReviewLoops = parseIntBounded(
    process.env.HYBRID_REVIEW_MAX_LOOPS,
    base.maxReviewLoops,
    0,
    3,
  );
  base.reviewEnabled = parseBool(process.env.HYBRID_REVIEW_ENABLED, base.reviewEnabled);
  base.leadFastTier = parseBool(process.env.HYBRID_LEAD_FAST_TIER, base.leadFastTier);
  base.synthesisEnabled = parseBool(
    process.env.HYBRID_SYNTHESIS_ENABLED,
    base.synthesisEnabled,
  );

  if (tier === 'deep' && base.deepLeadModel) {
    base.leadModel = base.deepLeadModel;
  }

  return base;
}

export function leadModelForTier(tier: JarvisQueryTier): string {
  return getHybridProfile(tier).leadModel;
}
