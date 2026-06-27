import { ADVISORY_PLAYBOOKS } from '@bellasos/contracts';
import type { JarvisExecutionPlan } from './types';

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

function looksLikeDebtLookup(message: string): boolean {
  return /\b(debt|debts|liabilit|what do i owe|how much do i owe|how much debt|my debts)\b/i.test(
    message,
  );
}

function looksLikeNetWorthLookup(message: string): boolean {
  return /\b(net worth|how much am i worth|what am i worth|tell me my net worth)\b/i.test(message);
}

function looksLikeFinanceWrite(message: string): boolean {
  return (
    /\bsmart transaction\b/i.test(message) ||
    (/\b(buy|purchase|log|record|add|make|do)\b/i.test(message) &&
      /\b(stock|share|shares|nvidia|nvda|apple|aapl|\d+\s*(rand|r\b))/i.test(message))
  );
}

/** Rule-based plan when OpenAI lead is unavailable or fails to parse. */
export function buildHeuristicPlan(message: string): JarvisExecutionPlan | null {
  const m = message.trim();
  if (!m) return null;

  if (looksLikeFinanceWrite(m)) {
    return {
      objective: 'Record the requested finance transaction',
      queryKind: 'write',
      handler: { type: 'agent_write', agentType: 'finance' },
      contextFetches: [],
      parsedUserInputs: {},
      missingUserInputs: [],
      clarifyingQuestions: [],
      synthesisGuide: '',
      deliverables: ['Confirm transaction outcome'],
      acceptanceCriteria: ['Reports success or clear error'],
      constraints: ['Concise'],
      localModelHint: 'general',
    };
  }

  if (looksLikeDebtLookup(m)) {
    return {
      objective: 'Report total debt from live Wealth data',
      queryKind: 'lookup',
      handler: { type: 'capability_read', capabilityId: 'wealth.summary.get' },
      contextFetches: [{ capabilityId: 'wealth.summary.get', label: 'Wealth summary', required: true }],
      parsedUserInputs: {},
      missingUserInputs: [],
      clarifyingQuestions: [],
      synthesisGuide: 'Answer with total debt only — one or two sentences.',
      deliverables: ['Total debt figure'],
      acceptanceCriteria: ['States total debt from live data'],
      constraints: ['Minimal answer'],
      localModelHint: 'general',
    };
  }

  if (looksLikeNetWorthLookup(m)) {
    return {
      objective: 'Report net worth from live Wealth data',
      queryKind: 'lookup',
      handler: { type: 'capability_read', capabilityId: 'wealth.summary.get' },
      contextFetches: [{ capabilityId: 'wealth.summary.get', label: 'Wealth summary', required: true }],
      parsedUserInputs: {},
      missingUserInputs: [],
      clarifyingQuestions: [],
      synthesisGuide: 'Net worth only — one sentence.',
      deliverables: ['Net worth figure'],
      acceptanceCriteria: ['States net worth from live data'],
      constraints: ['Minimal answer'],
      localModelHint: 'general',
    };
  }

  if (looksLikePropertyAdvisory(m)) {
    const playbook = ADVISORY_PLAYBOOKS.find((p) => p.id === 'wealth.property-purchase');
    const purchasePrice = parsePurchasePrice(m);
    const parsed: Record<string, unknown> = {};
    if (purchasePrice) parsed.purchasePrice = purchasePrice;

    const missing = ['interestRate', 'bondTermYears'].filter((field) => {
      if (field === 'purchasePrice') return !purchasePrice;
      return true;
    });
    if (!purchasePrice) missing.unshift('purchasePrice');

    const questions: string[] = [];
    if (!purchasePrice) questions.push('What is the purchase price?');
    if (missing.includes('interestRate')) {
      questions.push('What interest rate are you expecting on the bond (e.g. prime + 0.5%)?');
    }
    if (missing.includes('bondTermYears') && questions.length < 2) {
      questions.push('What bond term — 20 or 30 years?');
    }

    return {
      objective: 'Recommend optimal deposit for property purchase using live Wealth context',
      queryKind: 'advisory',
      handler: { type: 'gather_and_synthesize' },
      contextFetches: (playbook?.suggestedContextFetches ?? [
        'wealth.summary.get',
        'wealth.portfolio.summary',
        'wealth.portfolio.performance',
      ]).map((id) => ({
        capabilityId: id,
        label: id,
        required: id === 'wealth.summary.get',
      })),
      parsedUserInputs: parsed,
      missingUserInputs: missing.filter((x) => x !== 'purchasePrice' || !purchasePrice),
      clarifyingQuestions: questions.slice(0, 2),
      synthesisGuide:
        playbook?.synthesisGuide ??
        'Compare bond cost vs portfolio ROI. SA deposit norms 10-20%. Answer deposit question directly.',
      deliverables: ['Deposit recommendation with reasoning'],
      acceptanceCriteria: [
        'Answers deposit sizing question directly',
        'Cites live wealth figures',
        'Does not dump raw liability list',
      ],
      constraints: ['ZAR context', '2-4 sentences unless modelling requested'],
      localModelHint: 'general',
    };
  }

  return null;
}

export function mergeUserAnswerIntoPending(
  message: string,
  missingInputs: string[],
  parsedInputs: Record<string, unknown>,
): { parsedInputs: Record<string, unknown>; missingInputs: string[] } {
  const next = { ...parsedInputs };
  const remaining = [...missingInputs];
  const m = message.trim();

  if (remaining.includes('interestRate')) {
    if (/prime|\d+\.?\d*\s*%|\d+\.?\d*\s*percent/i.test(m)) {
      next.interestRate = m;
      const idx = remaining.indexOf('interestRate');
      if (idx >= 0) remaining.splice(idx, 1);
    }
  }
  if (remaining.includes('bondTermYears')) {
    const term = m.match(/\b(20|30)\b/);
    if (term) {
      next.bondTermYears = Number(term[1]);
      const idx = remaining.indexOf('bondTermYears');
      if (idx >= 0) remaining.splice(idx, 1);
    } else if (/\b20\s*year/i.test(m)) {
      next.bondTermYears = 20;
      remaining.splice(remaining.indexOf('bondTermYears'), 1);
    } else if (/\b30\s*year/i.test(m)) {
      next.bondTermYears = 30;
      remaining.splice(remaining.indexOf('bondTermYears'), 1);
    }
  }
  if (remaining.includes('purchasePrice')) {
    const price = m.match(/r?\s*([\d,.]+)\s*(m|million)?/i);
    if (price?.[1]) {
      let n = Number(price[1].replace(/,/g, ''));
      if (price[2] && /m|million/i.test(price[2])) n *= 1_000_000;
      if (Number.isFinite(n)) {
        next.purchasePrice = n;
        remaining.splice(remaining.indexOf('purchasePrice'), 1);
      }
    }
  }

  return { parsedInputs: next, missingInputs: remaining };
}
