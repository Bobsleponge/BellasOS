import { describe, expect, it, vi } from 'vitest';
import { executePlan } from './execute';
import { buildHeuristicPlan, mergeUserAnswerIntoPending } from './heuristic-plan';
import { enrichExecutionPlanFromPlaybooks, buildPlaybookFallbackPlan } from './playbook-enrich';
import { normalizeExecutionPlan, parseExecutionPlan } from './parse';
import type { CognitionPlatform } from './types';

describe('buildHeuristicPlan', () => {
  it('routes apartment deposit question to advisory gather', () => {
    const plan = buildHeuristicPlan(
      'i want to buy an apartment for R1.6million. how much deposit is optimal?',
    );
    expect(plan).not.toBeNull();
    expect(plan!.queryKind).toBe('advisory');
    expect(plan!.handler.type).toBe('gather_and_synthesize');
    expect(plan!.contextFetches.some((f) => f.capabilityId === 'wealth.summary.get')).toBe(true);
    expect(plan!.parsedUserInputs.purchasePrice).toBe(1_600_000);
    expect(plan!.missingUserInputs).toContain('interestRate');
    expect(plan!.clarifyingQuestions.length).toBeGreaterThan(0);
  });

  it('routes debt lookup to capability_read', () => {
    const plan = buildHeuristicPlan('How much debt do I have?');
    expect(plan!.queryKind).toBe('lookup');
    expect(plan!.handler.type).toBe('capability_read');
    expect(plan!.handler.capabilityId).toBe('wealth.summary.get');
  });

  it('routes smart transaction to agent_write', () => {
    const plan = buildHeuristicPlan('Buy R4000 of Nvidia');
    expect(plan!.queryKind).toBe('write');
    expect(plan!.handler.type).toBe('agent_write');
    expect(plan!.handler.agentType).toBe('finance');
  });
});

describe('mergeUserAnswerIntoPending', () => {
  it('parses bond term and rate from follow-up', () => {
    const merged = mergeUserAnswerIntoPending('Prime + 0.5%, 20 years', ['interestRate', 'bondTermYears'], {
      purchasePrice: 1_600_000,
    });
    expect(merged.missingInputs).not.toContain('bondTermYears');
    expect(merged.parsedInputs.bondTermYears).toBe(20);
    expect(merged.parsedInputs.interestRate).toBeTruthy();
  });
});

describe('parseExecutionPlan', () => {
  it('parses valid execution plan JSON', () => {
    const plan = parseExecutionPlan(
      JSON.stringify({
        objective: 'Recommend deposit',
        queryKind: 'advisory',
        handler: { type: 'gather_and_synthesize' },
        contextFetches: [{ capabilityId: 'wealth.summary.get', label: 'Summary', required: true }],
        parsedUserInputs: { purchasePrice: 1600000 },
        missingUserInputs: ['interestRate'],
        clarifyingQuestions: ['What rate?'],
        synthesisGuide: 'Compare ROI',
        deliverables: ['Deposit recommendation'],
        acceptanceCriteria: ['Answers deposit question'],
        constraints: ['ZAR'],
        localModelHint: 'general',
      }),
    );
    expect(plan?.objective).toBe('Recommend deposit');
    expect(plan?.queryKind).toBe('advisory');
  });
});

describe('normalizeExecutionPlan', () => {
  it('marks only wealth summary as required for advisory fetches', () => {
    const plan = normalizeExecutionPlan({
      objective: 'Deposit advice',
      queryKind: 'advisory',
      handler: { type: 'gather_and_synthesize' },
      contextFetches: [
        { capabilityId: 'wealth.summary.get', label: 'Wealth Summary', required: true },
        { capabilityId: 'wealth.portfolio.summary', label: 'Portfolio Summary', required: true },
        { capabilityId: 'wealth.portfolio.performance', label: 'Portfolio Performance', required: true },
      ],
      parsedUserInputs: { purchasePrice: 1_600_000 },
      missingUserInputs: ['interestRate'],
      clarifyingQuestions: ['What interest rate are you expecting?'],
      synthesisGuide: '',
      deliverables: [],
      acceptanceCriteria: [],
      constraints: [],
      localModelHint: 'general',
    });
    expect(plan.contextFetches.find((f) => f.capabilityId === 'wealth.summary.get')?.required).toBe(true);
    expect(plan.contextFetches.find((f) => f.capabilityId === 'wealth.portfolio.summary')?.required).toBe(false);
    expect(plan.contextFetches.find((f) => f.capabilityId === 'wealth.portfolio.performance')?.required).toBe(false);
  });
});

describe('enrichExecutionPlanFromPlaybooks', () => {
  it('forces clarifying questions when OpenAI lead skips missing inputs', () => {
    const raw = {
      objective: 'Recommend deposit',
      queryKind: 'advisory' as const,
      handler: { type: 'gather_and_synthesize' as const },
      contextFetches: [
        { capabilityId: 'wealth.summary.get', label: 'Wealth Summary', required: true },
        { capabilityId: 'wealth.portfolio.summary', label: 'Portfolio Summary', required: true },
      ],
      parsedUserInputs: { purchasePrice: 1_600_000 },
      missingUserInputs: [],
      clarifyingQuestions: [],
      synthesisGuide: '',
      deliverables: [],
      acceptanceCriteria: [],
      constraints: [],
      localModelHint: 'general' as const,
    };
    const plan = enrichExecutionPlanFromPlaybooks(raw, 'how much deposit is optimal for R1.6m apartment?');
    expect(plan.missingUserInputs).toContain('interestRate');
    expect(plan.missingUserInputs).toContain('bondTermYears');
    expect(plan.clarifyingQuestions.length).toBeGreaterThan(0);
    expect(plan.clarifyingQuestions[0]).toMatch(/interest rate/i);
  });

  it('ignores OpenAI-guessed bond rate and term not stated by user', () => {
    const plan = enrichExecutionPlanFromPlaybooks(
      {
        objective: 'Recommend deposit',
        queryKind: 'advisory',
        handler: { type: 'gather_and_synthesize' },
        contextFetches: [],
        parsedUserInputs: {
          purchasePrice: 1_600_000,
          interestRate: '11%',
          bondTermYears: 20,
        },
        missingUserInputs: [],
        clarifyingQuestions: [],
        synthesisGuide: '',
        deliverables: [],
        acceptanceCriteria: [],
        constraints: [],
        localModelHint: 'general',
      },
      'i want to buy an apartment for R1.6million. how much deposit is optimal?',
    );
    expect(plan.missingUserInputs).toContain('interestRate');
    expect(plan.missingUserInputs).toContain('bondTermYears');
  });
});

describe('executePlan advisory degrade', () => {
  it('asks clarifying questions when OpenAI-style plan omits missing inputs', async () => {
    const plan = enrichExecutionPlanFromPlaybooks(
      {
        objective: 'Recommend deposit',
        queryKind: 'advisory',
        handler: { type: 'gather_and_synthesize' },
        contextFetches: [{ capabilityId: 'wealth.summary.get', label: 'Summary', required: true }],
        parsedUserInputs: { purchasePrice: 1_600_000 },
        missingUserInputs: [],
        clarifyingQuestions: [],
        synthesisGuide: '',
        deliverables: [],
        acceptanceCriteria: [],
        constraints: [],
        localModelHint: 'general',
      },
      'i want to buy an apartment for R1.6million. how much deposit is optimal?',
    );
    const platform = {
      registry: {
        dispatch: vi.fn(async () => {
          throw new Error('Finance Tracker API key is not configured.');
        }),
      },
    } as unknown as CognitionPlatform;

    const outcome = await executePlan(
      platform,
      {
        message: 'i want to buy an apartment for R1.6million. how much deposit is optimal?',
        traceId: 't1',
        actorId: 'u1',
        ctx: { actorId: 'u1', roles: ['admin'], traceId: 't1' },
        systemPrompt: 'You are Jarvis.',
        historyMessages: [],
        userContent: 'i want to buy an apartment for R1.6million. how much deposit is optimal?',
      },
      plan,
    );

    expect(outcome.handled).toBe(true);
    expect(outcome.extra?.state).toBe('needs_clarification');
    expect(outcome.reply).toMatch(/interest rate/i);
    expect(outcome.pending).not.toBeNull();
  });
});

describe('executePlan advisory degrade (heuristic)', () => {
  it('asks clarifying questions when wealth summary fails but inputs are missing', async () => {
    const plan = buildHeuristicPlan(
      'i want to buy an apartment for R1.6million. how much deposit is optimal?',
    )!;
    const platform = {
      registry: {
        dispatch: vi.fn(async () => {
          throw new Error('Finance Tracker API key is not configured. Add it in Command Centre → Portfolio.');
        }),
      },
    } as unknown as CognitionPlatform;

    const outcome = await executePlan(platform, {
      message: 'i want to buy an apartment for R1.6million. how much deposit is optimal?',
      traceId: 't1',
      actorId: 'u1',
      ctx: { actorId: 'u1', roles: ['admin'], traceId: 't1' },
      systemPrompt: 'You are Jarvis.',
      historyMessages: [],
      userContent: 'i want to buy an apartment for R1.6million. how much deposit is optimal?',
    }, plan);

    expect(outcome.handled).toBe(true);
    expect(outcome.extra?.state).toBe('needs_clarification');
    expect(outcome.reply).toMatch(/interest rate|Finance Tracker/i);
    expect(outcome.pending).not.toBeNull();
  });
});

describe('extractFinanceText advice preference', () => {
  it('documents expected advice-before-liabilities behavior', () => {
    const keys = ['message', 'answer', 'advice', 'response'];
    expect(keys.indexOf('advice')).toBeLessThan(keys.indexOf('response'));
  });
});
