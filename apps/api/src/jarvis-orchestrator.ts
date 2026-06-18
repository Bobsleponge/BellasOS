import type { AgentInfo } from '@bellasos/contracts';

export interface JarvisRouterPlan {
  intent: 'chat' | 'agent' | 'module' | 'open_app';
  agentType?: string;
  moduleId?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  openApp?: string;
  prompt?: string;
  reply?: string;
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  memory:
    'Remember, recall, or summarize stored knowledge. Use for "what do you know about…", "remember this".',
  research:
    'Deep research on companies, industries, or topics. Persists reports via bellasos.research.',
  intelligence:
    'Daily/weekly sector briefings and intelligence reports via bellasos.intelligence.',
  portfolio:
    'Portfolio analysis, holdings, watchlist, allocation via bellasos.portfolio.',
  finance:
    'Live personal finance — net worth, transactions, assets, liabilities, smart transactions, log income/expense via Finance-Tracker (bellasos.finance-tracker). Has LIVE stock quotes and USD/ZAR rates.',
  automation:
    'Smart home control — list devices, turn on/off lights via bellasos.automation.',
  social:
    'Draft, schedule, or publish social posts via bellasos.social.',
  coding:
    'Build or fix runnable HTML apps/games end-to-end via Coding Studio pipeline (bellasos.coding).',
  operations:
    'Operational tasks, system health, planning, troubleshooting.',
};

const MODULE_ROUTING_HINTS = `
Modules (use intent "module" for direct execution, or "agent" to route through the matching specialist):
- bellasos.coding: task.execute (build), task.refine (fix/edit existing project)
- bellasos.research: run {subject, kind}
- bellasos.intelligence: brief.generate {cadence}
- bellasos.portfolio: analyze, summary, holdings.list
- bellasos.finance-tracker: summary.get, transactions.recent, income.list, expenses.list, assets.list, liabilities.list, investments.list, investments.add, income.add, expenses.add, transfers.add, investments.syncToPortfolio
- bellasos.social: draft.create {platform, topic, tone}
- bellasos.automation: devices.list, device.control {entityId, action}
- bellasos.camera: events.list
`;

export function buildAgentCatalog(agentInfos: AgentInfo[]): string {
  const lines = agentInfos.map((a) => {
    const desc =
      AGENT_DESCRIPTIONS[a.type] ??
      (a.dynamic && a.role ? a.role : 'General-purpose dynamic agent.');
    return `- ${a.name} (type: ${a.type}${a.dynamic ? ', dynamic' : ''}): ${desc}`;
  });
  return lines.join('\n');
}

/** Resolve router agentType to a registered agent name (case-insensitive). */
export function resolveAgentType(agentType: string | undefined, registered: string[]): string | undefined {
  if (!agentType?.trim()) return undefined;
  const key = agentType.trim().toLowerCase();
  const exact = registered.find((a) => a.toLowerCase() === key);
  if (exact) return exact;
  const byType = registered.find((a) => a.toLowerCase().includes(key) || key.includes(a.toLowerCase()));
  return byType;
}

export function buildJarvisRouterPrompt(input: {
  message: string;
  agents: AgentInfo[];
  moduleIds: string[];
  moduleApps: string[];
  historyBlock?: string;
}): string {
  const agentList = buildAgentCatalog(input.agents);
  const agentNames = input.agents.map((a) => a.name).join(', ');

  return `You are Jarvis, the BellasOS orchestrator. You can dispatch to ANY registered agent or module.
Classify the user message and return ONLY valid JSON (no markdown):
{
  "intent": "chat" | "agent" | "module" | "open_app",
  "agentType": "<one of: ${agentNames}>",
  "moduleId": "<module id from: ${input.moduleIds.join(', ')}>",
  "action": "<module action name if intent is module>",
  "actionInput": {},
  "openApp": "<app id: ${input.moduleApps.join(', ')}, system.console, ai.studio>",
  "prompt": "<instruction for agent if intent is agent>",
  "reply": "<short conversational reply if intent is chat or open_app>"
}

Available agents:
${agentList}

${MODULE_ROUTING_HINTS}

Routing rules:
- Prefer intent "agent" with the matching specialist for domain tasks (research, portfolio, coding, social, etc.)
- Use intent "module" when a specific module action is clearly needed
- "open portfolio/research/coding" -> intent open_app with openApp set
- build/create/code/game -> agent coding OR module bellasos.coding task.execute; openApp bellasos.coding
- fix/edit/update game or code -> agent coding OR module bellasos.coding task.refine; openApp bellasos.coding
- research questions -> agent research
- briefings/news/sectors -> agent intelligence
- portfolio/holdings/analysis (BellasOS holdings only) -> agent portfolio
- net worth/transactions/expenses/income/debt/assets/liabilities/financial information/finance app/finance tracker/portfolio app money -> agent finance (live Finance-Tracker data)
- "look at portfolio app" or "see my financial information" -> agent finance, NOT memory, NOT chat
- draft/post/social -> agent social
- lights/devices/home -> agent automation
- remember/recall stored facts only -> agent memory (NOT for live finance data)
- general conversation -> intent chat with reply
- NEVER include routing JSON in the reply field. reply must be plain conversational text for the user.
- Return complete valid JSON only — no placeholders like "<module id from: ...>"
${input.historyBlock ? `\nConversation so far:\n${input.historyBlock}\n` : ''}
Current user message: ${input.message}`;
}

export function defaultOpenAppForAgent(agentType: string): string | undefined {
  const map: Record<string, string> = {
    portfolio: 'bellasos.portfolio',
    finance: 'bellasos.portfolio',
    research: 'bellasos.research',
    intelligence: 'bellasos.intelligence',
    social: 'bellasos.social',
    automation: 'bellasos.automation',
    coding: 'bellasos.coding',
    camera: 'bellasos.camera',
  };
  return map[agentType.toLowerCase()];
}

export function looksLikeFinanceQuery(message: string): boolean {
  return /\b(net worth|financial (information|info|data|summary|overview|health|situation|picture)|my (money|finances|accounts|investments|assets|liabilities|debts|expenses|income|spending|transactions)|all my financial|finance app|finance tracker|finance-?tracker|log (an |)(expense|income|spending)|what did i spend|how much (do i|am i) (have|worth|owe))\b/i.test(
    message,
  ) || /\b(portfolio app|on the portfolio).*\b(financ|money|worth|account|investment|expense|income|transaction)\b/i.test(
    message,
  ) || /\b(look|see|show|find|get).*\b(portfolio|finance).*\b(financ|money|worth|information|data)\b/i.test(
    message,
  ) || /\b(smart transaction)\b/i.test(message)
  || /\b(create|add|record|log|make).*\b(transaction|investment|purchase)\b/i.test(message)
  || /\b(buy|purchase|invest in|sell).*\b(stock|share|shares|etf|equity|apple|aapl|microsoft|nvidia|tesla)\b/i.test(
    message,
  ) || /\b(i asked you|you were supposed|please|can you|want you to)\b.*\b(make|create|add|record|buy|do)\b/i.test(message)
  || /\b(do|make)\b.*\b(transaction)\b/i.test(message)
  || /\b(intel|intc)\b/i.test(message) && /\b(stock|share|transaction|invest)\b/i.test(message)
  || /\b\d+\s*(rand|r\b)/i.test(message) && /\b(stock|share|shares|apple|aapl|nvidia|nvda|intel|intc|investment)\b/i.test(message);
}

export function looksLikeFinanceWrite(message: string): boolean {
  return (
    /\b(smart transaction|back\s*dat|backdate)\b/i.test(message) ||
    (/\b(log|record|add|create|make|buy|purchase|do|transaction|initiate)\b/i.test(message) &&
      /\b(stock|share|shares|investment|expense|income|transfer|apple|aapl|nvidia|nvda|intel|intc|\d+\s*(rand|r\b))\b/i.test(
        message,
      )) ||
    (/\b(i asked you|please|can you|want you to|need you to)\b/i.test(message) &&
      /\b(make|create|add|record|buy|do|initiate)\b/i.test(message) &&
      /\b(stock|share|investment|transaction|apple|aapl|nvidia|nvda|intel|intc|\d+\s*(rand|r\b))\b/i.test(message))
  );
}

export function isLiveMarketDataQuestion(text: string): boolean {
  return /\b(stock price|share price|opening price|open price|opening yesterday|day before yesterday|exchange rate|usd\/zar|market data|real-?time access|current price|provide.*price|confirm.*price|in south african rands)\b/i.test(
    text,
  ) || isAccountMetadataQuestion(text);
}

function isAccountMetadataQuestion(text: string): boolean {
  return /\b(account details|investment account|type of.*shares|specific type|which account|confirm your investment account)\b/i.test(
    text,
  );
}

export function looksLikeRouterJsonLeak(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith('{')) return false;
  return /"intent"\s*:/.test(t) || /"agentType"\s*:/.test(t) || /"moduleId"\s*:/.test(t);
}

/** Fix common misroutes and strip leaked router JSON from replies. */
export function normalizeRouterPlan(plan: JarvisRouterPlan, message: string): JarvisRouterPlan {
  const next = { ...plan };

  if (next.reply && looksLikeRouterJsonLeak(next.reply)) {
    delete next.reply;
  }

  if (looksLikeFinanceQuery(message)) {
    if (next.intent === 'chat' || next.agentType === 'memory' || next.agentType === 'portfolio') {
      return {
        intent: 'agent',
        agentType: 'finance',
        prompt: next.prompt ?? message,
        openApp: 'bellasos.portfolio',
      };
    }
  }

  if (next.intent === 'chat' && next.agentType && next.agentType !== 'memory') {
    return {
      ...next,
      intent: 'agent',
      prompt: next.prompt ?? message,
    };
  }

  if (next.intent === 'chat' && !next.reply?.trim() && next.agentType) {
    return {
      ...next,
      intent: 'agent',
      prompt: next.prompt ?? message,
    };
  }

  return next;
}

export function parseJarvisRouterJson(text: string): JarvisRouterPlan | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as JarvisRouterPlan;
    if (parsed.moduleId?.includes('<') || parsed.action?.includes('<')) return null;
    if (parsed.openApp?.includes('<')) return null;
    return parsed;
  } catch {
    return null;
  }
}
