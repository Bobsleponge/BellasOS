"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyJarvisQuery = classifyJarvisQuery;
exports.selectModelForTier = selectModelForTier;
exports.planJarvisCompletion = planJarvisCompletion;
const DEEP_KEYWORDS = /\b(research|analyze|analysis|compare|comparison|draft|write|brief|report|investigate|deep dive|comprehensive|strategy|architecture|implement|code|debug|refactor|explain in detail|pros and cons|step by step|whitepaper|thesis|summarize this|break down)\b/i;
const STANDARD_KEYWORDS = /\b(explain|why|how|describe|difference between|what are the|tell me about|overview|guide|help me understand)\b/i;
/** Classify a user message into a Jarvis tier without an extra LLM call. */
function classifyJarvisQuery(message) {
    const text = message.trim();
    if (!text)
        return 'fast';
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (/^how (long|far|many|much|old|big|tall|wide|deep|fast|high)\b/i.test(lower) && words <= 22) {
        return 'fast';
    }
    if (DEEP_KEYWORDS.test(lower) || text.length > 220 || words > 45) {
        return 'deep';
    }
    if (STANDARD_KEYWORDS.test(lower) ||
        words > 18 ||
        text.length > 120 ||
        (text.includes('?') && words > 10)) {
        return 'standard';
    }
    return 'fast';
}
function tierDefaults(tier) {
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
function capabilityForTask(taskType) {
    return taskType === 'reasoning' || taskType === 'research' || taskType === 'coding'
        ? 'reasoning'
        : 'chat';
}
/** Pick the best enabled model for a tier from the registry. */
function selectModelForTier(tier, models, isProviderConfigured = () => false) {
    const defaults = tierDefaults(tier);
    const capability = capabilityForTask(defaults.taskType);
    let pool = models.filter((m) => m.enabled && m.capabilities.includes(capability) && (m.local || isProviderConfigured(m.provider)));
    if (pool.length === 0) {
        pool = models.filter((m) => m.enabled && m.capabilities.includes('chat') && (m.local || isProviderConfigured(m.provider)));
    }
    if (pool.length === 0)
        return undefined;
    const bySizeAsc = [...pool].sort((a, b) => (a.paramsB ?? 999) - (b.paramsB ?? 999) || (a.latencyHint ?? 99) - (b.latencyHint ?? 99));
    const bySizeDesc = [...bySizeAsc].reverse();
    if (tier === 'fast') {
        const local = bySizeAsc.filter((m) => m.local);
        return (local[0] ?? bySizeAsc[0])?.id;
    }
    if (tier === 'deep') {
        const reasoning = pool.filter((m) => m.capabilities.includes('reasoning'));
        const ranked = (reasoning.length > 0 ? reasoning : pool).sort((a, b) => (b.paramsB ?? 0) - (a.paramsB ?? 0));
        const preferCloud = process.env.JARVIS_PREFER_CLOUD_FOR_DEEP !== 'false';
        if (preferCloud) {
            const cloud = ranked.filter((m) => !m.local && isProviderConfigured(m.provider));
            if (cloud.length > 0)
                return cloud[0]?.id;
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
/**
 * Central Jarvis routing hub: classify the question, pick model + generation
 * settings, and return a plan for the AI gateway.
 */
function planJarvisCompletion(message, models, options = {}) {
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
//# sourceMappingURL=jarvis-hub.js.map