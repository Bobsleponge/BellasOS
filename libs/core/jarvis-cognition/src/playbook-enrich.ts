import { ADVISORY_PLAYBOOKS, type AdvisoryPlaybook } from '@bellasos/contracts';
import { normalizeExecutionPlan } from './parse';
import type { JarvisExecutionPlan } from './types';

const CLARIFY_BY_FIELD: Record<string, string> = {
  purchasePrice: 'What is the purchase price?',
  interestRate: 'What interest rate are you expecting on the bond (e.g. prime + 0.5%)?',
  bondTermYears: 'What bond term are you considering — 20 or 30 years?',
};

function parsePurchasePrice(message: string): number | undefined {
  const m = message.match(/r\s*([\d,.]+)\s*(m|million|mil)?/i);
  if (!m?.[1]) return undefined;
  let n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return undefined;
  if (m[2] && /m|million|mil/i.test(m[2])) n *= 1_000_000;
  return n;
}

function looksLikePropertyAdvisory(message: string): boolean {
  return (
    /\b(apartment|house|flat|property|home|bond|mortgage|deposit|down payment)\b/i.test(message) &&
    /\b(buy|buying|purchase|purchasing|afford|optimal|how much|should i|deposit|down payment)\b/i.test(
      message,
    )
  );
}

function parseInputsFromMessage(message: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  const purchasePrice = parsePurchasePrice(message);
  if (purchasePrice) parsed.purchasePrice = purchasePrice;

  if (/prime|\d+\.?\d*\s*%|\d+\.?\d*\s*percent/i.test(message)) {
    const rateMatch = message.match(/(?:prime[^,\n]{0,40}|\d+\.?\d*\s*%)/i);
    parsed.interestRate = rateMatch?.[0]?.trim() ?? message.trim();
  }

  const term = message.match(/\b(20|30)\b/);
  if (term) parsed.bondTermYears = Number(term[1]);
  else if (/\b20\s*year/i.test(message)) parsed.bondTermYears = 20;
  else if (/\b30\s*year/i.test(message)) parsed.bondTermYears = 30;

  return parsed;
}

function playbookMatchesMessage(message: string, playbook: AdvisoryPlaybook): boolean {
  if (playbook.id === 'wealth.property-purchase') {
    return looksLikePropertyAdvisory(message);
  }
  const lower = message.toLowerCase();
  return playbook.triggerExamples.some((example) => {
    const words = example.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    if (words.length === 0) return false;
    const hits = words.filter((w) => lower.includes(w)).length;
    return hits >= Math.min(2, words.length);
  });
}

export function matchAdvisoryPlaybook(message: string): AdvisoryPlaybook | undefined {
  return ADVISORY_PLAYBOOKS.find((playbook) => playbookMatchesMessage(message, playbook));
}

function hasInputValue(parsed: Record<string, unknown>, field: string): boolean {
  const val = parsed[field];
  return val !== undefined && val !== null && val !== '';
}

/** Bond inputs only count when the user stated them in this message (not OpenAI guesses). */
function unresolvedPlaybookInputs(
  playbook: AdvisoryPlaybook,
  message: string,
  planParsed: Record<string, unknown>,
): { parsedUserInputs: Record<string, unknown>; missingUserInputs: string[] } {
  const fromMessage = parseInputsFromMessage(message);
  const parsedUserInputs = { ...planParsed, ...fromMessage };

  const missingUserInputs = playbook.requiredUserInputs.filter((field) => {
    if (hasInputValue(fromMessage, field)) return false;
    if (field === 'interestRate' || field === 'bondTermYears') return true;
    if (field === 'purchasePrice') {
      return !parsePurchasePrice(message) && !hasInputValue(planParsed, field);
    }
    return !hasInputValue(parsedUserInputs, field);
  });

  return { parsedUserInputs, missingUserInputs };
}

function buildClarifyingQuestions(missing: string[]): string[] {
  return missing.slice(0, 2).map((field) => CLARIFY_BY_FIELD[field] ?? `What is your ${field}?`);
}

export function buildPlaybookFallbackPlan(message: string): JarvisExecutionPlan | null {
  const playbook = matchAdvisoryPlaybook(message);
  if (!playbook) return null;
  return {
    objective: `Advisory: ${playbook.id}`,
    queryKind: 'advisory',
    handler: { type: 'gather_and_synthesize' },
    contextFetches: [],
    parsedUserInputs: {},
    missingUserInputs: [],
    clarifyingQuestions: [],
    synthesisGuide: playbook.synthesisGuide,
    deliverables: [],
    acceptanceCriteria: [],
    constraints: ['ZAR context'],
    localModelHint: 'general',
  };
}

/** Align OpenAI/heuristic plans with advisory playbooks — enforce clarify-before-synthesize. */
export function enrichExecutionPlanFromPlaybooks(
  plan: JarvisExecutionPlan,
  message: string,
): JarvisExecutionPlan {
  const playbook = matchAdvisoryPlaybook(message);
  if (!playbook) return normalizeExecutionPlan(plan);

  const { parsedUserInputs, missingUserInputs } = unresolvedPlaybookInputs(
    playbook,
    message,
    plan.parsedUserInputs,
  );

  const existingIds = new Set(plan.contextFetches.map((fetch) => fetch.capabilityId));
  const extraFetches = playbook.suggestedContextFetches
    .filter((id) => !existingIds.has(id))
    .map((id) => ({
      capabilityId: id,
      label: id.replace(/^wealth\./, '').replace(/\./g, ' '),
      required: false,
    }));

  const shouldAdvisory =
    plan.queryKind === 'advisory' ||
    plan.queryKind === 'chat' ||
    (plan.queryKind === 'lookup' && looksLikePropertyAdvisory(message));

  const enriched: JarvisExecutionPlan = {
    ...plan,
    queryKind: shouldAdvisory ? 'advisory' : plan.queryKind,
    handler: shouldAdvisory ? { type: 'gather_and_synthesize' } : plan.handler,
    parsedUserInputs,
    missingUserInputs: shouldAdvisory ? missingUserInputs : plan.missingUserInputs,
    clarifyingQuestions:
      shouldAdvisory && missingUserInputs.length > 0
        ? buildClarifyingQuestions(missingUserInputs)
        : plan.clarifyingQuestions,
    contextFetches: [...plan.contextFetches, ...extraFetches],
    synthesisGuide: plan.synthesisGuide.trim() || playbook.synthesisGuide,
    deliverables:
      plan.deliverables.length > 0
        ? plan.deliverables
        : ['Direct answer grounded in live Wealth data when available'],
    acceptanceCriteria:
      plan.acceptanceCriteria.length > 0
        ? plan.acceptanceCriteria
        : [
            'Answers the deposit question directly',
            'Cites live net worth/debt/investment figures when context is available',
            'Does not give generic industry ranges without user-specific reasoning',
          ],
  };

  return normalizeExecutionPlan(enriched);
}
