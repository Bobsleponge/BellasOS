import { looksLikeBriefingRequest } from './briefing';

/** How much detail Jarvis should surface in a single turn. */
export type JarvisReplyScope = 'minimal' | 'focused' | 'standard' | 'comprehensive';

export interface ReplyScopeResult {
  scope: JarvisReplyScope;
  instruction: string;
}

const SCOPE_INSTRUCTIONS: Record<JarvisReplyScope, string> = {
  minimal:
    'Answer ONLY what was asked — one short sentence (two max for voice). No extra metrics, breakdowns, suggestions, source attribution, or "want more?" unless they asked.',
  focused:
    'Answer the specific topic only. Include directly relevant fields; omit unrelated sections, apps, and background.',
  standard:
    'Lead with the direct answer in 2–4 sentences. Add context only when it clearly helps; offer depth instead of dumping it.',
  comprehensive:
    'The user wants a fuller picture — include relevant breakdown, cross-links, and practical next steps.',
};

const COMPREHENSIVE =
  /\b(overview|full (?:picture|breakdown|summary|status)|complete picture|big picture|run[\s-]?down|status update|how am i doing|how are things|what(?:'s| is) (?:my|the) (?:status|situation|state)|summarize everything|tell me everything|give me (?:the )?full|everything (?:about|on)|financial (?:status|overview|picture|health|situation|position)|all my (?:financial|goals|decisions|projects)|end of day|deeper briefing)\b/i;

const MINIMAL =
  /\b(what(?:'s| is) my net worth|tell me my net worth|how much am i worth|what am i worth|my net worth\b|just (?:the|tell me)|only (?:the|tell me)|yes or no|is (?:it|that|this|harvi|truafrica|finance)|are we connected|is .+ connected|how many\b|what time|when is the|who is the)\b/i;

const FOCUSED =
  /\b(list|show (?:me )?(?:my|the|recent|open|pending)|recent (?:transactions|activity|reports|briefings)|open (?:decisions|goals|tasks|projects)|pending approvals|my goals\b|my decisions\b|latest (?:news|briefing|report))\b/i;

const WRITE_OR_ACTION = /\b(log|record|add|create|buy|sell|schedule|publish|connect|open|fix|build|run)\b/i;

/**
 * Infer how much detail Jarvis should return — narrow question, narrow answer.
 * Used across chat, agents, modules, and structured data formatters.
 */
export function resolveReplyScope(message: string, domain?: string): ReplyScopeResult {
  const m = message.trim();
  if (!m) return scopeResult('standard');

  if (looksLikeBriefingRequest(m).match) {
    return scopeResult('comprehensive');
  }

  if (COMPREHENSIVE.test(m)) {
    return scopeResult('comprehensive');
  }

  if (MINIMAL.test(m)) {
    return scopeResult('minimal');
  }

  if (FOCUSED.test(m) && !COMPREHENSIVE.test(m)) {
    return scopeResult('focused');
  }

  if (WRITE_OR_ACTION.test(m)) {
    return scopeResult('focused');
  }

  const words = m.split(/\s+/).filter(Boolean);
  const isShortQuestion =
    words.length <= 8 && (m.endsWith('?') || /^(what|how much|when|where|who|is|are|do|does|can)\b/i.test(m));

  if (isShortQuestion && !/\b(and|also|overview|status|everything|all my)\b/i.test(m)) {
    if (domain === 'wealth' && /\b(net worth|worth|how much)\b/i.test(m)) {
      return scopeResult('minimal');
    }
    return scopeResult('focused');
  }

  return scopeResult('standard');
}

function scopeResult(scope: JarvisReplyScope): ReplyScopeResult {
  return { scope, instruction: SCOPE_INSTRUCTIONS[scope] };
}

export function formatReplyScopeForPrompt(message: string, domain?: string): string {
  const { scope, instruction } = resolveReplyScope(message, domain);
  return `Reply scope (${scope}): ${instruction}`;
}

export function appendReplyScopeToPrompt(
  basePrompt: string,
  message: string,
  domain?: string,
): string {
  const block = formatReplyScopeForPrompt(message, domain);
  if (basePrompt.includes(block)) return basePrompt;
  return `${basePrompt.trim()}\n\n${block}`;
}

/** Skip long source attribution on minimal single-fact answers. */
export function shouldUseSourceAttribution(scope: JarvisReplyScope): boolean {
  return scope !== 'minimal';
}

export { SCOPE_INSTRUCTIONS as REPLY_SCOPE_INSTRUCTIONS };
