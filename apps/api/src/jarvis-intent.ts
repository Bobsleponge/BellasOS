import type { AgentInfo } from '@bellasos/contracts';
import {
  buildAgentCatalog,
  defaultOpenAppForAgent,
  isLiveMarketDataQuestion,
  looksLikeFinanceQuery,
  looksLikeFinanceWrite,
  resolveAgentType,
} from './jarvis-orchestrator';

export type JarvisActionKind = 'read' | 'write' | 'navigate' | 'chat' | 'unknown';
export type JarvisHandlerType = 'agent' | 'module' | 'chat' | 'open_app' | 'clarify';

export interface JarvisIntentAnalysis {
  understanding: {
    goal: string;
    summary: string;
    actionKind: JarvisActionKind;
    domain: string;
  };
  handler: {
    type: JarvisHandlerType;
    agentType?: string;
    moduleId?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    openApp?: string;
  };
  confidence: number;
  needsClarification: boolean;
  clarifyingQuestions?: string[];
  /** Plain-language reply for chat or clarification turns. */
  reply?: string;
  /** Instruction passed to the chosen agent/module. */
  prompt?: string;
}

const MODULE_ROUTING_HINTS = `
Modules and key actions:
- bellasos.coding: task.execute (build new app/game), task.refine (fix/edit existing project — requires active project)
- bellasos.research: run {subject, kind}
- bellasos.intelligence: brief.generate {cadence}
- bellasos.portfolio: analyze, summary, holdings.list (BellasOS internal holdings — NOT live household finance)
- bellasos.finance-tracker: summary.get, transactions.recent, investments.list, investments.add, income.add, expenses.add, assets.list, liabilities.list, investments.syncToPortfolio (live personal/household finance in ZAR; LIVE stock quotes and USD/ZAR for smart transactions)
- bellasos.social: draft.create {platform, topic, tone}
- bellasos.automation: devices.list, device.control {entityId, action}
- bellasos.camera: events.list
`;

const CLARIFY_THRESHOLD = 0.72;

export function buildJarvisIntentPrompt(input: {
  message: string;
  agents: AgentInfo[];
  moduleIds: string[];
  moduleApps: string[];
  historyBlock?: string;
  activeCodingProjectId?: string;
}): string {
  const agentList = buildAgentCatalog(input.agents);
  const agentNames = input.agents.map((a) => a.name).join(', ');

  return `You are Jarvis, the BellasOS intent analyst. Read the user message in context and decide what they want, who should handle it, and whether you have enough information to act.

Return ONLY valid JSON (no markdown):
{
  "understanding": {
    "goal": "<what the user wants to achieve>",
    "summary": "<one short sentence paraphrasing the request>",
    "actionKind": "read" | "write" | "navigate" | "chat" | "unknown",
    "domain": "<finance|coding|research|portfolio|social|automation|memory|general|...>"
  },
  "handler": {
    "type": "agent" | "module" | "chat" | "open_app" | "clarify",
    "agentType": "<one of: ${agentNames}>",
    "moduleId": "<module id>",
    "action": "<module action when type is module>",
    "actionInput": {},
    "openApp": "<app id: ${input.moduleApps.join(', ')}, system.console, ai.studio>"
  },
  "confidence": 0.0,
  "needsClarification": false,
  "clarifyingQuestions": ["<question if info is missing>"],
  "reply": "<what to say to the user when type is chat, clarify, or open_app>",
  "prompt": "<clear instruction for the chosen agent/module>"
}

Available agents:
${agentList}

${MODULE_ROUTING_HINTS}

Decision rules:
1. Understand intent from meaning — do NOT rely on specific keywords. "Do a small transaction of R4000 Nvidia" = finance write (buy shares).
2. Live household money (net worth, expenses, income, debts, buying/selling shares, Finance-Tracker) → handler.type "agent", agentType "finance". NOT memory, NOT portfolio agent.
3. BellasOS portfolio holdings/analysis only → agent "portfolio".
4. Build/create/code/game → agent "coding" or module bellasos.coding task.execute; openApp bellasos.coding. NOT for finance smart transactions — "make a smart transaction" / buy shares is finance, not coding.
5. Fix/edit existing code/game → agent "coding" or module bellasos.coding task.refine (needs active project).
6. Research / company analysis → agent "research". Sector briefings → agent "intelligence".
7. Open/show an app → handler.type "open_app" with openApp set and a brief reply.
8. General conversation, greetings, opinions, simple facts → handler.type "chat" with a helpful reply.
9. If critical details are missing for a write action (amount, symbol, date, which account, which project to edit), set needsClarification true, handler.type "clarify", confidence below 0.7, and ask 1–2 specific clarifyingQuestions in reply.
10. Never put routing JSON in reply. reply must be plain conversational text.
11. confidence: 0.9+ when intent and handler are clear; 0.5–0.7 when guessing; below 0.5 when very uncertain.
12. For finance share purchases with a Rand amount but no date, proceed — use today unless user specified a past date.
13. Finance-Tracker provides LIVE stock quotes and USD/ZAR exchange rates. For smart transactions / share purchases, NEVER ask the user for stock price, opening price, or exchange rate — the finance agent fetches them automatically.
14. "Smart transaction", "make a transaction in the portfolio/finance app", buy shares with Rand amount → agent "finance", actionKind "write". Only clarify if symbol or Rand amount is truly missing.
${input.activeCodingProjectId ? `\nActive Coding Studio project id: ${input.activeCodingProjectId}\n` : ''}
${input.historyBlock ? `\nConversation so far:\n${input.historyBlock}\n` : ''}
Current user message: ${input.message}`;
}

export function parseJarvisIntentJson(text: string): JarvisIntentAnalysis | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as JarvisIntentAnalysis;
    if (!parsed.understanding || !parsed.handler) return null;
    if (parsed.handler.moduleId?.includes('<') || parsed.handler.action?.includes('<')) return null;
    if (parsed.handler.openApp?.includes('<')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function looksLikeIntentJsonLeak(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith('{')) return false;
  return (
    /"understanding"\s*:/.test(t) ||
    /"handler"\s*:/.test(t) ||
    /"needsClarification"\s*:/.test(t)
  );
}

export function shouldAskForClarification(analysis: JarvisIntentAnalysis, message?: string): boolean {
  const context = message ?? '';
  if (looksLikeFinanceWrite(context)) {
    return false;
  }
  if (looksLikeFinanceQuery(context)) {
    const questions = analysis.clarifyingQuestions?.filter(Boolean) ?? [];
    const onlyLiveData =
      questions.length > 0 && questions.every((q) => isLiveMarketDataQuestion(q));
    if (onlyLiveData || (analysis.reply && isLiveMarketDataQuestion(analysis.reply))) {
      return false;
    }
    if (/\bsmart transaction\b/i.test(context) && analysis.handler.agentType === 'finance') {
      return false;
    }
  }
  if (analysis.needsClarification || analysis.handler.type === 'clarify') return true;
  if (analysis.confidence < CLARIFY_THRESHOLD && analysis.understanding.actionKind === 'write') return true;
  return analysis.confidence < 0.45;
}

export function formatClarificationReply(analysis: JarvisIntentAnalysis): string {
  if (analysis.reply?.trim() && !looksLikeIntentJsonLeak(analysis.reply)) {
    return analysis.reply.trim();
  }
  const questions = analysis.clarifyingQuestions?.filter((q) => q?.trim()) ?? [];
  if (questions.length === 0) {
    return "I want to help — could you tell me a bit more about what you'd like me to do?";
  }
  if (questions.length === 1) return questions[0]!.trim();
  return `${questions[0]!.trim()} Also, ${questions[1]!.trim().replace(/^[A-Z]/, (c) => c.toLowerCase())}`;
}

export function normalizeIntentAnalysis(
  analysis: JarvisIntentAnalysis,
  registeredAgents: string[],
  moduleIds: string[],
  message?: string,
  historyBlock?: string,
): JarvisIntentAnalysis {
  const next: JarvisIntentAnalysis = {
    ...analysis,
    understanding: {
      goal: String(analysis.understanding?.goal ?? '').trim() || 'Unknown goal',
      summary: String(analysis.understanding?.summary ?? '').trim() || 'User request',
      actionKind: analysis.understanding?.actionKind ?? 'unknown',
      domain: String(analysis.understanding?.domain ?? 'general').trim() || 'general',
    },
    handler: { ...analysis.handler },
    confidence: clampConfidence(analysis.confidence),
    needsClarification: Boolean(analysis.needsClarification),
    clarifyingQuestions: analysis.clarifyingQuestions?.filter(Boolean),
    reply: analysis.reply?.trim(),
    prompt: analysis.prompt?.trim(),
  };

  if (next.reply && looksLikeIntentJsonLeak(next.reply)) {
    delete next.reply;
  }

  if (next.handler.agentType) {
    next.handler.agentType = resolveAgentType(next.handler.agentType, registeredAgents) ?? next.handler.agentType;
  }

  if (next.handler.moduleId && !moduleIds.includes(next.handler.moduleId)) {
    const fuzzy = moduleIds.find(
      (id) =>
        id.includes(next.handler.moduleId!) ||
        next.handler.moduleId!.includes(id.replace('bellasos.', '')),
    );
    if (fuzzy) next.handler.moduleId = fuzzy;
  }

  if (next.handler.type === 'agent' && next.handler.agentType && !next.handler.openApp) {
    next.handler.openApp = defaultOpenAppForAgent(next.handler.agentType);
  }

  if (next.handler.type === 'chat' && next.handler.agentType && next.handler.agentType !== 'memory') {
    next.handler.type = 'agent';
    next.prompt = next.prompt ?? next.understanding.summary;
  }

  if (
    next.understanding.domain === 'finance' &&
    next.handler.type === 'chat' &&
    next.understanding.actionKind !== 'chat'
  ) {
    next.handler = { type: 'agent', agentType: 'finance', openApp: 'bellasos.portfolio' };
    next.prompt = next.prompt ?? next.understanding.summary;
  }

  if (
    next.understanding.domain === 'finance' &&
    (next.handler.agentType === 'memory' || next.handler.agentType === 'portfolio')
  ) {
    next.handler = { type: 'agent', agentType: 'finance', openApp: 'bellasos.portfolio' };
    next.prompt = next.prompt ?? next.understanding.summary;
  }

  const routingContext = [message, historyBlock, next.prompt, next.understanding.summary]
    .filter(Boolean)
    .join('\n');
  if (routingContext && (looksLikeFinanceWrite(routingContext) || looksLikeFinanceQuery(routingContext))) {
    next.handler = { type: 'agent', agentType: 'finance', openApp: 'bellasos.portfolio' };
    next.understanding.domain = 'finance';
    if (looksLikeFinanceWrite(routingContext)) {
      next.understanding.actionKind = 'write';
    }
    next.prompt = next.prompt ?? message ?? next.understanding.summary;
    if (next.reply && isLiveMarketDataQuestion(next.reply)) {
      delete next.reply;
    }
    if (next.clarifyingQuestions?.every((q) => isLiveMarketDataQuestion(q))) {
      next.needsClarification = false;
      next.handler.type = 'agent';
    }
    if (/\bsmart transaction\b/i.test(routingContext)) {
      next.needsClarification = false;
      next.handler.type = 'agent';
    }
  }

  return next;
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/** Map legacy router plans onto the intent shape for gradual migration. */
export function intentFromLegacyRouter(plan: {
  intent: string;
  agentType?: string;
  moduleId?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  openApp?: string;
  prompt?: string;
  reply?: string;
}): JarvisIntentAnalysis {
  const handlerType =
    plan.intent === 'open_app'
      ? 'open_app'
      : plan.intent === 'agent'
        ? 'agent'
        : plan.intent === 'module'
          ? 'module'
          : 'chat';

  return {
    understanding: {
      goal: plan.prompt ?? plan.reply ?? 'User request',
      summary: plan.prompt ?? plan.reply ?? 'User request',
      actionKind: handlerType === 'chat' ? 'chat' : 'unknown',
      domain: plan.agentType ?? plan.moduleId ?? 'general',
    },
    handler: {
      type: handlerType as JarvisHandlerType,
      agentType: plan.agentType,
      moduleId: plan.moduleId,
      action: plan.action,
      actionInput: plan.actionInput,
      openApp: plan.openApp,
    },
    confidence: 0.6,
    needsClarification: false,
    reply: plan.reply,
    prompt: plan.prompt,
  };
}
