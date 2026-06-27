import {
  classifyJarvisQuery,
  getHybridProfile,
  planJarvisCompletion,
  runHybridRefine,
  runHybridReview,
  selectLocalModelForTier,
} from '@bellasos/ai-routing';
import type { ChatMessage } from '@bellasos/contracts';
import { gatherPlanContext, summarizeContextForClarify } from './gather';
import { mergeUserAnswerIntoPending } from './heuristic-plan';
import { runExecutionPlanLead, openAiConfigured, cognitionEnabled } from './lead';
import { planToTaskBrief, normalizeExecutionPlan } from './parse';
import { enrichExecutionPlanFromPlaybooks, buildPlaybookFallbackPlan, matchAdvisoryPlaybook } from './playbook-enrich';
import { buildHeuristicPlan } from './heuristic-plan';
import {
  formatContextBundleForPrompt,
  formatExecutionPlanForExecutor,
} from './prompt';
import type {
  CognitionOutcome,
  CognitionPlatform,
  CognitionTurnInput,
  ContextBundle,
  JarvisExecutionPlan,
  PendingExecution,
} from './types';

const FINANCE_SUMMARY_CAPABILITY = 'wealth.summary.get';

function financeTrackerUnavailableNote(bundle: ContextBundle): string | null {
  const summary = bundle.entries.find((e) => e.capabilityId === FINANCE_SUMMARY_CAPABILITY);
  if (!summary?.error) return null;
  const msg = summary.error.toLowerCase();
  if (msg.includes('api key') || msg.includes('command centre') || msg.includes('not configured')) {
    return "I couldn't reach Finance Tracker — add your API key in Command Centre → Portfolio if you want advice grounded in your live accounts.";
  }
  if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network')) {
    return "Finance Tracker isn't running right now, so I don't have live household numbers.";
  }
  return "I couldn't pull your live Wealth summary from Finance Tracker.";
}

function formatClarifyReply(
  plan: JarvisExecutionPlan,
  bundleSummary: string,
  bundle?: ContextBundle,
): string {
  const questions = plan.clarifyingQuestions.filter(Boolean).slice(0, 2);
  const offlineNote = bundle ? financeTrackerUnavailableNote(bundle) : null;
  const prefaceParts = [bundleSummary.trim(), offlineNote?.trim()].filter(Boolean);
  const preface = prefaceParts.length ? `${prefaceParts.join(' ')} ` : '';
  if (questions.length === 0) {
    return `${preface}I need a bit more detail before I can give you a solid answer.`.trim();
  }
  if (questions.length === 1) {
    return `${preface}${questions[0]!}`.trim();
  }
  return `${preface}${questions[0]!} Also, ${questions[1]!.replace(/^[A-Z]/, (c) => c.toLowerCase())}`.trim();
}

async function synthesizeFromPlan(
  platform: CognitionPlatform,
  input: {
    plan: JarvisExecutionPlan;
    bundle: Awaited<ReturnType<typeof gatherPlanContext>>;
    systemPrompt: string;
    historyMessages: ChatMessage[];
    userContent: string;
    message: string;
    traceId: string;
  },
): Promise<{ text: string; meta: Record<string, unknown> }> {
  const tier = classifyJarvisQuery(input.message);
  const profile = getHybridProfile(tier);
  const brief = planToTaskBrief(input.plan);
  const contextBlock = formatContextBundleForPrompt(input.bundle);
  const planBlock = formatExecutionPlanForExecutor(input.plan);

  const defaults = planJarvisCompletion(input.message, platform.ai.listModels(), {
    forceTier: tier,
    pinModel: process.env.JARVIS_MODEL,
  });

  const executeBase = {
    taskType: defaults.taskType,
    traceId: input.traceId,
    model:
      selectLocalModelForTier(tier, platform.ai.listModels(), input.plan.localModelHint) ??
      defaults.model,
    maxTokens: defaults.maxTokens,
    temperature: defaults.temperature,
  };

  let draft = (
    await platform.ai.complete({
      ...executeBase,
      messages: [
        {
          role: 'system',
          content: `${input.systemPrompt}\n\n${planBlock}\n\n${contextBlock}`,
        },
        ...input.historyMessages,
        { role: 'user', content: input.userContent },
      ],
    })
  ).text.trim();

  const meta: Record<string, unknown> = {
    cognition: true,
    queryKind: input.plan.queryKind,
    hybridProfile: profile.leadModel,
  };

  if (profile.reviewEnabled && (await openAiConfigured(platform))) {
    let loops = 0;
    while (loops < profile.maxReviewLoops) {
      const review = await runHybridReview(platform.ai, {
        brief,
        draft,
        traceId: input.traceId,
        tier,
        profile,
      });
      if (!review || review.passed || review.gaps.length === 0) {
        meta.reviewPassed = true;
        break;
      }
      const refined = await runHybridRefine(platform.ai, {
        executeBase,
        systemPrompt: input.systemPrompt,
        historyMessages: input.historyMessages,
        userContent: `${input.userContent}\n\n${contextBlock}`,
        gaps: review.gaps,
        draft,
        brief,
        tier,
        profile,
      });
      draft = refined.text;
      meta.reviewLoops = loops + 1;
      loops += 1;
    }
  }

  return { text: draft, meta };
}

async function executeCapabilityRead(
  platform: CognitionPlatform,
  plan: JarvisExecutionPlan,
  bundle: Awaited<ReturnType<typeof gatherPlanContext>>,
  userMessage: string,
): Promise<string> {
  const capId = plan.handler.capabilityId ?? plan.contextFetches[0]?.capabilityId;
  const entry = bundle.entries.find((e) => e.capabilityId === capId) ?? bundle.entries[0];
  if (!entry || entry.error) {
    return entry?.error
      ? `I couldn't reach that data source: ${entry.error}`
      : 'I could not fetch live data for that question.';
  }

  const data = entry.data as Record<string, unknown>;
  if (capId === 'wealth.summary.get' || !capId) {
    if (/\b(debt|owe|liabilit)\b/i.test(userMessage)) {
      const debt = data.totalLiabilities;
      if (typeof debt === 'number') {
        return `Your total debt is R${debt.toLocaleString('en-ZA')}.`;
      }
    }
    if (/\bnet worth\b/i.test(userMessage)) {
      const nw = data.netWorth;
      if (typeof nw === 'number') {
        return `Your net worth is R${nw.toLocaleString('en-ZA')}.`;
      }
    }
    const nw = data.netWorth;
    const debt = data.totalLiabilities;
    if (typeof nw === 'number' && typeof debt === 'number') {
      return `Net worth R${nw.toLocaleString('en-ZA')}; total debt R${debt.toLocaleString('en-ZA')}.`;
    }
  }

  if (typeof data.message === 'string') return data.message;
  if (typeof data.advice === 'string') return data.advice;
  return JSON.stringify(data, null, 2);
}

export async function resumePendingExecution(
  platform: CognitionPlatform,
  input: CognitionTurnInput,
  pending: PendingExecution,
): Promise<CognitionOutcome> {
  const merged = mergeUserAnswerIntoPending(
    input.message,
    pending.missingInputs,
    pending.parsedInputs,
  );

  const plan: JarvisExecutionPlan = {
    ...pending.plan,
    parsedUserInputs: { ...pending.plan.parsedUserInputs, ...merged.parsedInputs },
    missingUserInputs: merged.missingInputs,
    clarifyingQuestions:
      merged.missingInputs.length > 0 ? pending.plan.clarifyingQuestions : [],
  };

  if (merged.missingInputs.length > 0) {
    const summary = summarizeContextForClarify(pending.gatheredContext);
    return {
      handled: true,
      reply: formatClarifyReply(plan, summary, pending.gatheredContext),
      pending: {
        ...pending,
        plan,
        parsedInputs: merged.parsedInputs,
        missingInputs: merged.missingInputs,
      },
      extra: { cognition: true, state: 'needs_clarification', queryKind: plan.queryKind },
    };
  }

  if (plan.handler.type === 'agent_write' && plan.handler.agentType && platform.orchestrator) {
    const result = await platform.orchestrator.command({
      agentType: plan.handler.agentType,
      prompt: input.message,
      input: {},
      traceId: input.traceId,
      actorId: input.actorId,
    });
    const out = (result as { output?: Record<string, unknown> })?.output ?? result;
    const msg =
      out && typeof out === 'object'
        ? String(
            (out as Record<string, unknown>).message ??
              (out as Record<string, unknown>).answer ??
              JSON.stringify(out),
          )
        : String(result);
    return {
      handled: true,
      reply: msg,
      pending: null,
      extra: { cognition: true, queryKind: 'write', routedTo: { kind: 'agent', id: plan.handler.agentType } },
    };
  }

  const synth = await synthesizeFromPlan(platform, {
    plan,
    bundle: pending.gatheredContext,
    systemPrompt: input.systemPrompt,
    historyMessages: input.historyMessages,
    userContent: input.userContent,
    message: input.message,
    traceId: input.traceId,
  });

  return {
    handled: true,
    reply: synth.text,
    pending: null,
    extra: { ...synth.meta, queryKind: plan.queryKind },
  };
}

export async function executePlan(
  platform: CognitionPlatform,
  input: CognitionTurnInput,
  planInput: JarvisExecutionPlan,
): Promise<CognitionOutcome> {
  const plan = enrichExecutionPlanFromPlaybooks(normalizeExecutionPlan(planInput), input.message);
  if (plan.handler.type === 'open_app' && plan.handler.openApp) {
    return {
      handled: true,
      reply: `Opening ${plan.handler.openApp}.`,
      pending: null,
      extra: { cognition: true, openApp: plan.handler.openApp, queryKind: plan.queryKind },
    };
  }

  if (plan.handler.type === 'agent_write' && plan.handler.agentType && platform.orchestrator) {
    const result = await platform.orchestrator.command({
      agentType: plan.handler.agentType,
      prompt: input.message,
      input: {},
      traceId: input.traceId,
      actorId: input.actorId,
    });
    const out = (result as { output?: Record<string, unknown> })?.output ?? result;
    const msg =
      out && typeof out === 'object'
        ? String(
            (out as Record<string, unknown>).message ??
              (out as Record<string, unknown>).answer ??
              JSON.stringify(out),
          )
        : String(result);
    return {
      handled: true,
      reply: msg,
      pending: null,
      extra: {
        cognition: true,
        queryKind: 'write',
        routedTo: { kind: 'agent', id: plan.handler.agentType },
      },
    };
  }

  const fetches =
    plan.contextFetches.length > 0
      ? plan.contextFetches
      : plan.handler.capabilityId
        ? [
            {
              capabilityId: plan.handler.capabilityId,
              label: plan.handler.capabilityId,
              required: true,
            },
          ]
        : [];

  const bundle = await gatherPlanContext(platform, fetches, input.ctx);

  const requiredFailed = bundle.entries.filter(
    (e) => fetches.find((f) => f.capabilityId === e.capabilityId)?.required && e.error,
  );
  const summaryFailed = bundle.entries.find(
    (e) => e.capabilityId === FINANCE_SUMMARY_CAPABILITY && e.error,
  );

  if (plan.missingUserInputs.length > 0 && plan.clarifyingQuestions.length > 0) {
    const summary = summarizeContextForClarify(bundle);
    const pending: PendingExecution = {
      plan,
      gatheredContext: bundle,
      parsedInputs: plan.parsedUserInputs,
      missingInputs: plan.missingUserInputs,
      startedAt: new Date().toISOString(),
    };
    return {
      handled: true,
      reply: formatClarifyReply(plan, summary, bundle),
      pending,
      extra: {
        cognition: true,
        state: 'needs_clarification',
        queryKind: plan.queryKind,
        wealthSummaryUnavailable: Boolean(summaryFailed),
      },
    };
  }

  if (
    plan.queryKind === 'advisory' &&
    requiredFailed.length > 0 &&
    !bundle.entries.some((e) => !e.error && e.data != null)
  ) {
    return {
      handled: true,
      reply: `I couldn't pull live Wealth data (${requiredFailed.map((e) => e.label).join(', ')}). Connect Finance Tracker in Command Centre → Portfolio, then ask again.`,
      pending: null,
      extra: { cognition: true, state: 'error', queryKind: plan.queryKind },
    };
  }

  if (
    plan.handler.type === 'capability_read' ||
    (plan.queryKind === 'lookup' && plan.handler.type !== 'gather_and_synthesize')
  ) {
    const reply = await executeCapabilityRead(platform, plan, bundle, input.message);
    return {
      handled: true,
      reply,
      pending: null,
      extra: { cognition: true, queryKind: 'lookup' },
    };
  }

  if (plan.queryKind === 'advisory' && matchAdvisoryPlaybook(input.message)) {
    const replay = enrichExecutionPlanFromPlaybooks(plan, input.message);
    if (replay.missingUserInputs.length > 0 && replay.clarifyingQuestions.length > 0) {
      const summary = summarizeContextForClarify(bundle);
      return {
        handled: true,
        reply: formatClarifyReply(replay, summary, bundle),
        pending: {
          plan: replay,
          gatheredContext: bundle,
          parsedInputs: replay.parsedUserInputs,
          missingInputs: replay.missingUserInputs,
          startedAt: new Date().toISOString(),
        },
        extra: {
          cognition: true,
          state: 'needs_clarification',
          queryKind: replay.queryKind,
          wealthSummaryUnavailable: Boolean(summaryFailed),
        },
      };
    }
  }

  const synth = await synthesizeFromPlan(platform, {
    plan,
    bundle,
    systemPrompt: input.systemPrompt,
    historyMessages: input.historyMessages,
    userContent: input.userContent,
    message: input.message,
    traceId: input.traceId,
  });

  return {
    handled: true,
    reply: synth.text,
    pending: null,
    extra: { ...synth.meta, queryKind: plan.queryKind },
  };
}

export async function runCognitionTurn(
  platform: CognitionPlatform,
  input: CognitionTurnInput,
): Promise<CognitionOutcome> {
  if (input.pending) {
    return resumePendingExecution(platform, input, input.pending);
  }

  const plan = await runExecutionPlanLead(platform, {
    message: input.message,
    traceId: input.traceId,
    historyBlock: input.historyBlock,
    contextBlock: input.contextBlock,
  });

  if (!plan) {
    const fallback = buildHeuristicPlan(input.message) ?? buildPlaybookFallbackPlan(input.message);
    if (fallback) {
      return executePlan(
        platform,
        input,
        enrichExecutionPlanFromPlaybooks(fallback, input.message),
      );
    }
    if (!cognitionEnabled() || !(await openAiConfigured(platform))) {
      return { handled: false, reason: 'openai_unavailable' };
    }
    return { handled: false, reason: 'lead_parse_failed' };
  }

  return executePlan(platform, input, plan);
}
