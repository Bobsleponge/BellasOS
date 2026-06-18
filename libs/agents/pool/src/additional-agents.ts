import type { AgentResult, AgentTask, AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';
import {
  buildFinanceMathMessage,
  extractFinanceMathFacts,
  isLiveMarketDataQuestion,
  looksLikeFinanceMath,
  looksLikeInvestmentWrite,
  plainFinanceMathMessage,
} from './finance-math';
import {
  isAccountMetadataQuestion,
  parsePurchaseDate,
  extractSecurityQuery,
  type LiveSymbolMatch,
} from './finance-investment';

function looksLikeRefine(prompt: string): boolean {
  return /\b(fix|update|edit|change|improve|refine|modify|adjust|arrow keys|keyboard|controls|not working|doesn'?t work|broken|bug)\b/i.test(
    prompt,
  );
}

function looksLikeBuild(prompt: string): boolean {
  return /\b(build|create|make|write|develop|implement|game|snake|pong|html|app|playable)\b/i.test(
    prompt,
  );
}

export class CodingAgent extends BaseAgent {
  readonly type: AgentType = 'coding';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? task.input.goal ?? '').trim();
    const projectId = task.input.projectId as string | undefined;

    if (this.deps.modules && prompt) {
      if (looksLikeRefine(prompt) || task.input.refine) {
        if (!projectId) {
          throw new Error('Select a project in Coding Studio before applying edits.');
        }
        const result = await this.deps.modules.invoke(
          'bellasos.coding',
          'task.refine',
          { prompt, projectId },
          task,
        );
        return { output: result as Record<string, unknown> };
      }
      if ((looksLikeBuild(prompt) || task.input.executePipeline) && !looksLikeRefine(prompt)) {
        const result = await this.deps.modules.invoke(
          'bellasos.coding',
          'task.execute',
          { goal: prompt },
          task,
        );
        return { output: result as Record<string, unknown> };
      }
    }

    const res = await this.deps.ai.complete({
      taskType: 'coding',
      traceId: task.traceId,
      messages: [
        { role: 'system', content: 'You are a senior software engineer.' },
        { role: 'user', content: prompt },
      ],
    });
    return { output: { result: res.text } };
  }
}

export class PortfolioAgent extends BaseAgent {
  readonly type: AgentType = 'portfolio';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? '').trim();

    if (this.deps.modules) {
      if (/\b(analyz|summary|allocation|holdings|watchlist|portfolio)\b/i.test(prompt) || !prompt) {
        const result = await this.deps.modules.invoke(
          'bellasos.portfolio',
          'analyze',
          {},
          task,
        );
        return { output: result as Record<string, unknown> };
      }
    }

    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are a portfolio analyst. Comment on allocation, risk and notable changes for the request below.',
        },
        { role: 'user', content: prompt || JSON.stringify(task.input) },
      ],
    });
    return { output: { analysis: res.text } };
  }
}

type FinancePlannerAction =
  | 'summary.get'
  | 'transactions.recent'
  | 'investments.list'
  | 'investments.add'
  | 'investments.syncToPortfolio'
  | 'expenses.add'
  | 'income.add'
  | 'assets.list'
  | 'liabilities.list'
  | 'answer';

interface FinanceActionPlan {
  action: FinancePlannerAction;
  confidence: number;
  needsClarification: boolean;
  clarifyingQuestions?: string[];
  reply?: string;
  extractedInput?: Record<string, unknown>;
}

function friendlyFinanceConnectionError(message: string): string {
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect ETIMEDOUT/i.test(message)) {
    return 'Finance-Tracker is not running. Start it on port 5000 (`cd Finance-Tracker && npm run dev`), then try again.';
  }
  return message;
}

export class FinanceAgent extends BaseAgent {
  readonly type: AgentType = 'finance';

  private async finance(
    action: string,
    input: Record<string, unknown>,
    task: AgentTask,
  ): Promise<Record<string, unknown>> {
    if (!this.deps.modules) throw new Error('Module gateway unavailable');
    try {
      return (await this.deps.modules.invoke('bellasos.finance-tracker', action, input, task)) as Record<
        string,
        unknown
      >;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(friendlyFinanceConnectionError(message));
    }
  }

  private async planFinanceAction(prompt: string, task: AgentTask): Promise<FinanceActionPlan> {
    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content: `You are a finance action planner for a South African household (ZAR). Analyze what the user wants and pick ONE action.

Return ONLY JSON:
{
  "action": "summary.get" | "transactions.recent" | "investments.list" | "investments.add" | "investments.syncToPortfolio" | "expenses.add" | "income.add" | "assets.list" | "liabilities.list" | "answer",
  "confidence": 0.0,
  "needsClarification": false,
  "clarifyingQuestions": ["<specific question>"],
  "reply": "<optional message when clarifying>",
  "extractedInput": {}
}

Action guide:
- summary.get: net worth, financial overview, how much am I worth
- transactions.recent: recent spending, expenses, income activity
- investments.list: show holdings, stocks, ETFs
- investments.add: buy/purchase shares, smart transaction, record investment (extract symbol, amountZar, quantity, purchaseDate, accountType). Finance-Tracker fetches live/historical opening prices and USD/ZAR automatically — NEVER ask the user for stock price or exchange rate.
- investments.syncToPortfolio: sync/update holdings to portfolio
- expenses.add / income.add: log spending or income
- assets.list / liabilities.list: property, debts, loans
- answer: general finance question, currency conversion, exchange rate, Rand/USD math (use live rates — do NOT compute yourself)

Finance-Tracker has LIVE stock quotes and USD/ZAR rates. For smart transactions, never ask the user to provide prices or FX — the system fetches them when recording.

For investments.add extractedInput use: {"symbol":"TICKER or company query","name":"...","amountZar":number,"quantity":number,"purchaseDate":"YYYY-MM-DD","accountType":"TFSA|taxable|RA","investmentType":"stock"}
Put the company name or ticker in symbol/name — Finance-Tracker resolves the live ticker via Yahoo search. Do NOT hardcode ticker mappings.
If a write action is intended but amount, symbol, or other critical detail is missing, set needsClarification true and ask 1-2 questions.`,
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 400,
      temperature: 0.1,
    });

    const match = res.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { action: 'answer', confidence: 0.4, needsClarification: false };
    }

    try {
      const parsed = JSON.parse(match[0]) as FinanceActionPlan;
      return {
        action: parsed.action ?? 'answer',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
        needsClarification: Boolean(parsed.needsClarification),
        clarifyingQuestions: parsed.clarifyingQuestions?.filter(Boolean),
        reply: parsed.reply?.trim(),
        extractedInput: parsed.extractedInput,
      };
    } catch {
      return { action: 'answer', confidence: 0.4, needsClarification: false };
    }
  }

  private async writeFromPrompt(
    action: 'expenses.add' | 'income.add',
    prompt: string,
    task: AgentTask,
    prefilled?: Record<string, unknown>,
  ): Promise<AgentResult> {
    if (prefilled && Object.keys(prefilled).length > 0) {
      try {
        const recorded = await this.finance(action, prefilled, task);
        return { output: { recorded, action } };
      } catch (err) {
        return {
          output: {
            error: err instanceof Error ? err.message : String(err),
            action,
          },
        };
      }
    }

    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            action === 'expenses.add'
              ? 'Extract an expense from the user message. Return ONLY JSON: {"amount":number,"category":"groceries|housing|transport|utilities|entertainment|healthcare|bank_fees|other","description":"string","date":"YYYY-MM-DD"}. Use today if date omitted.'
              : 'Extract income from the user message. Return ONLY JSON: {"amount":number,"type":"salary|bonus|freelance|investment|other","description":"string","date":"YYYY-MM-DD","is_gross":boolean}. Use today if date omitted.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 256,
      temperature: 0.1,
    });

    const match = res.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { output: { error: 'Could not parse expense/income from request', raw: res.text } };
    }

    try {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const recorded = await this.finance(action, parsed, task);
      return { output: { recorded, action } };
    } catch (err) {
      return {
        output: {
          error: err instanceof Error ? err.message : String(err),
          action,
        },
      };
    }
  }

  private async resolveSymbolLive(
    query: string,
    task: AgentTask,
  ): Promise<LiveSymbolMatch | { ambiguous: LiveSymbolMatch[] } | null> {
    const q = query.trim();
    if (q.length < 2) return null;

    const results = (await this.finance('investments.search', { query: q }, task)) as LiveSymbolMatch[];
    if (!Array.isArray(results) || results.length === 0) return null;
    if (results.length === 1) return results[0]!;
    const upper = q.toUpperCase();
    const exact = results.find((r) => r.symbol.toUpperCase() === upper);
    if (exact) return exact;
    return { ambiguous: results.slice(0, 5) };
  }

  private async writeInvestmentFromPrompt(
    prompt: string,
    task: AgentTask,
    prefilled?: Record<string, unknown>,
  ): Promise<AgentResult> {
    let parsed: Record<string, unknown> | null = prefilled && Object.keys(prefilled).length > 0 ? prefilled : null;

    if (!parsed) {
      const res = await this.deps.ai.complete({
        taskType: 'reasoning',
        traceId: task.traceId,
        messages: [
          {
            role: 'system',
            content:
              'Extract an investment purchase (smart transaction) from the user message. Return ONLY JSON: {"symbol":"ticker or company name","name":"Company name","amountZar":number|null,"quantity":number|null,"purchasePrice":number|null,"purchaseDate":"YYYY-MM-DD","investmentType":"stock","accountType":"TFSA|taxable|RA","description":"string"}. Use amountZar for Rand amounts. Put company name or ticker in symbol/name — live Finance-Tracker search resolves the ticker. Parse "yesterday"/"today" to ISO dates. Leave purchasePrice null for opening-price purchases. Default accountType TFSA. Never ask for stock price or exchange rate.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 320,
        temperature: 0.1,
      });

      const match = res.text.match(/\{[\s\S]*\}/);
      if (!match) {
        return { output: { error: 'Could not parse investment purchase from request', raw: res.text } };
      }
      parsed = JSON.parse(match[0]) as Record<string, unknown>;
    }

    try {
      const searchQuery =
        String(parsed.symbol ?? '').trim() ||
        String(parsed.name ?? '').trim() ||
        extractSecurityQuery(prompt) ||
        '';
      if (!searchQuery) {
        return {
          output: {
            error: 'Which stock or company should I record?',
            needsClarification: true,
            clarifyingQuestions: ['Which stock or company is this for?'],
          },
        };
      }

      const resolved = await this.resolveSymbolLive(searchQuery, task);
      if (!resolved) {
        return {
          output: {
            error: `I couldn't find a listed stock matching "${searchQuery}" via live market search.`,
            action: 'investments.add',
          },
        };
      }
      if ('ambiguous' in resolved) {
        const options = resolved.ambiguous.map((r) => `${r.symbol} (${r.name})`).join(', ');
        return {
          output: {
            message: `I found several matches for "${searchQuery}": ${options}. Which ticker should I use?`,
            needsClarification: true,
            clarifyingQuestions: [`Which ticker should I use? Options: ${options}`],
          },
        };
      }

      const payload: Record<string, unknown> = {
        symbol: resolved.symbol,
        name: parsed.name ? String(parsed.name) : resolved.name,
        investmentType: parsed.investmentType ? String(parsed.investmentType) : 'stock',
        accountType: parsed.accountType ? String(parsed.accountType) : 'TFSA',
        purchaseDate: parsed.purchaseDate ? String(parsed.purchaseDate) : parsePurchaseDate(prompt) ?? undefined,
        description: parsed.description ? String(parsed.description) : undefined,
        commission: typeof parsed.commission === 'number' ? parsed.commission : 0,
      };
      if (typeof parsed.amountZar === 'number' && parsed.amountZar > 0) {
        payload.amountZar = parsed.amountZar;
      }
      if (typeof parsed.quantity === 'number' && parsed.quantity > 0) {
        payload.quantity = parsed.quantity;
      }
      if (typeof parsed.purchasePrice === 'number' && parsed.purchasePrice > 0) {
        payload.purchasePrice = parsed.purchasePrice;
      }
      if (!payload.amountZar && !payload.quantity) {
        return {
          output: {
            error: 'Specify either a Rand amount or share quantity for the purchase.',
            needsClarification: true,
            clarifyingQuestions: [
              'How much would you like to invest (in Rand), or how many shares should I record?',
            ],
          },
        };
      }

      const recorded = await this.finance('investments.add', payload, task);
      const dateNote = payload.purchaseDate ? ` on ${payload.purchaseDate}` : '';
      const rec = recorded as { quantity?: number; purchase_price?: number; symbol?: string };
      const priceNote =
        rec.purchase_price != null
          ? ` at $${Number(rec.purchase_price).toFixed(2)} open (${rec.quantity ?? '?'} shares)`
          : '';
      return {
        output: {
          recorded,
          action: 'investments.add',
          message: `Done — recorded smart transaction: ${payload.amountZar ? `R${payload.amountZar} of ` : ''}${payload.symbol}${dateNote}${priceNote}.`,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        output: {
          error: friendlyFinanceConnectionError(message),
          action: 'investments.add',
        },
      };
    }
  }

  private formatClarification(plan: FinanceActionPlan): AgentResult {
    const questions = plan.clarifyingQuestions?.filter(Boolean) ?? [];
    const reply =
      plan.reply?.trim() ||
      (questions.length > 0
        ? questions[0]!
        : 'Could you give me a bit more detail so I can record that correctly?');
    return {
      output: {
        message: reply,
        needsClarification: true,
        clarifyingQuestions: questions,
      },
    };
  }

  private isWriteAction(action: FinancePlannerAction): boolean {
    return action === 'investments.add' || action === 'expenses.add' || action === 'income.add';
  }

  private hasInvestmentCoreInput(input?: Record<string, unknown>): boolean {
    if (!input) return false;
    const symbol = String(input.symbol ?? '').trim();
    const amountZar = typeof input.amountZar === 'number' ? input.amountZar : null;
    const quantity = typeof input.quantity === 'number' ? input.quantity : null;
    return symbol.length > 0 && ((amountZar != null && amountZar > 0) || (quantity != null && quantity > 0));
  }

  private shouldClarifyInvestment(plan: FinanceActionPlan, prompt: string): boolean {
    if (this.hasInvestmentCoreInput(plan.extractedInput)) return false;

    const questions = (plan.clarifyingQuestions ?? []).filter(
      (q) => q && !isLiveMarketDataQuestion(q) && !isAccountMetadataQuestion(q),
    );
    if (plan.reply && (isLiveMarketDataQuestion(plan.reply) || isAccountMetadataQuestion(plan.reply))) {
      return questions.length > 0;
    }
    if (looksLikeInvestmentWrite(prompt) && /\d[\d,]*\s*(rand|r\b)/i.test(prompt)) {
      return questions.some((q) => /\b(which stock|what stock|which company|ticker|symbol)\b/i.test(q));
    }
    return (plan.needsClarification || plan.confidence < 0.65) && questions.length > 0;
  }

  private async answerWithLiveMath(prompt: string, task: AgentTask): Promise<AgentResult> {
    const facts = extractFinanceMathFacts(prompt);
    const exchange = await this.finance(
      'currency.exchangeRate.get',
      facts.date ? { date: facts.date } : {},
      task,
    );
    const rate = Number((exchange as { rate?: number }).rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        output: {
          error: 'Could not fetch live USD/ZAR rate from Finance-Tracker.',
        },
      };
    }

    let quote:
      | { price?: number; open?: number; currency?: string; name?: string; symbol?: string }
      | undefined;
    if (facts.wantsShareEstimate) {
      const query = facts.symbol ?? extractSecurityQuery(prompt);
      if (query) {
        const resolved = await this.resolveSymbolLive(query, task);
        if (resolved && !('ambiguous' in resolved)) {
          quote = (await this.finance(
            'investments.quote.get',
            { symbol: resolved.symbol, date: facts.date ?? undefined },
            task,
          )) as typeof quote;
        }
      }
    }

    const result = buildFinanceMathMessage({
      facts,
      rate,
      rateSource: (exchange as { source?: string }).source,
      quote,
    });
    const message = plainFinanceMathMessage(result.message);

    return {
      output: {
        answer: message,
        message,
        computed: result.computed,
        mathFromLiveData: true,
      },
    };
  }

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? '').trim();

    if (!this.deps.modules) {
      const res = await this.deps.ai.complete({
        taskType: 'reasoning',
        traceId: task.traceId,
        messages: [
          { role: 'system', content: 'You are a personal finance assistant for a South African household (ZAR).' },
          { role: 'user', content: prompt || JSON.stringify(task.input) },
        ],
      });
      return { output: { response: res.text } };
    }

    const status = await this.finance('connection.status', {}, task);
    if (status.connected === false) {
      return {
        output: {
          error:
            'Finance-Tracker is not reachable. Connect it in Command Centre → Portfolio with your API key.',
          status,
        },
      };
    }

    if (!prompt) {
      const summary = await this.finance('summary.get', {}, task);
      return { output: summary };
    }

    const plan = await this.planFinanceAction(prompt, task);
    const investmentWrite =
      plan.action === 'investments.add' ||
      (looksLikeInvestmentWrite(prompt) && !this.isWriteAction(plan.action));

    if (investmentWrite) {
      if (this.shouldClarifyInvestment(plan, prompt)) {
        return this.formatClarification(plan);
      }
      return this.writeInvestmentFromPrompt(prompt, task, plan.extractedInput);
    }

    if (plan.needsClarification) {
      return this.formatClarification(plan);
    }

    if (looksLikeFinanceMath(prompt) && !this.isWriteAction(plan.action)) {
      return this.answerWithLiveMath(prompt, task);
    }

    switch (plan.action) {
      case 'summary.get':
        return { output: await this.finance('summary.get', {}, task) };
      case 'transactions.recent':
        return { output: { transactions: await this.finance('transactions.recent', { limit: 15 }, task) } };
      case 'investments.list':
        return { output: { investments: await this.finance('investments.list', {}, task) } };
      case 'investments.syncToPortfolio':
        return { output: await this.finance('investments.syncToPortfolio', {}, task) };
      case 'assets.list':
        return { output: { assets: await this.finance('assets.list', {}, task) } };
      case 'liabilities.list':
        return { output: { liabilities: await this.finance('liabilities.list', {}, task) } };
      case 'expenses.add':
        return this.writeFromPrompt('expenses.add', prompt, task, plan.extractedInput);
      case 'income.add':
        return this.writeFromPrompt('income.add', prompt, task, plan.extractedInput);
      case 'investments.add':
        return this.writeInvestmentFromPrompt(prompt, task, plan.extractedInput);
      case 'answer':
      default: {
        if (looksLikeFinanceMath(prompt)) {
          return this.answerWithLiveMath(prompt, task);
        }
        const summary = await this.finance('summary.get', {}, task);
        const res = await this.deps.ai.complete({
          taskType: 'reasoning',
          traceId: task.traceId,
          messages: [
            {
              role: 'system',
              content:
                'You are a personal finance assistant. Answer using the live Finance-Tracker summary provided. Amounts are ZAR unless stated otherwise. Be concise and actionable. Never guess currency conversions or share counts — those are computed elsewhere.',
            },
            {
              role: 'user',
              content: `User question: ${prompt}\n\nLive summary:\n${JSON.stringify(summary, null, 2)}`,
            },
          ],
        });
        return { output: { summary, answer: res.text } };
      }
    }
  }
}

export class AutomationAgent extends BaseAgent {
  readonly type: AgentType = 'automation';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? task.input.intent ?? '').trim();

    if (this.deps.modules && prompt) {
      if (/\b(list|show|what).*\b(device|light|lights|home)\b/i.test(prompt) || !prompt) {
        const devices = await this.deps.modules.invoke(
          'bellasos.automation',
          'devices.list',
          {},
          task,
        );
        return { output: { devices } };
      }
      const res = await this.deps.ai.complete({
        taskType: 'reasoning',
        traceId: task.traceId,
        messages: [
          {
            role: 'system',
            content:
              'Extract a smart-home control command. Return ONLY JSON: {"entityId":"string or empty","action":"turn_on|turn_off|toggle","deviceName":"string"}. If entityId unknown, leave empty and set deviceName.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 180,
        temperature: 0.1,
      });
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as {
            entityId?: string;
            action?: string;
            deviceName?: string;
          };
          let entityId = parsed.entityId?.trim();
          if (!entityId) {
            const devices = (await this.deps.modules.invoke(
              'bellasos.automation',
              'devices.list',
              {},
              task,
            )) as Array<{ entityId: string; name: string }>;
            const name = parsed.deviceName?.toLowerCase();
            entityId = devices.find((d) => d.name.toLowerCase().includes(name ?? ''))?.entityId;
          }
          if (entityId && parsed.action) {
            const result = await this.deps.modules.invoke(
              'bellasos.automation',
              'device.control',
              { entityId, action: parsed.action },
              task,
            );
            return { output: result as Record<string, unknown> };
          }
        } catch {
          /* fall through */
        }
      }
    }

    return {
      output: {
        plan: { intent: prompt || 'noop', steps: [] },
      },
    };
  }
}

export class SocialAgent extends BaseAgent {
  readonly type: AgentType = 'social';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? '').trim();

    if (this.deps.modules && /\b(draft|post|write|create|schedule|publish)\b/i.test(prompt)) {
      const res = await this.deps.ai.complete({
        taskType: 'general',
        traceId: task.traceId,
        messages: [
          {
            role: 'system',
            content:
              'Extract social post intent. Return ONLY JSON: {"platform":"twitter|linkedin|facebook|instagram","topic":"string","tone":"professional|casual|witty"}',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 160,
        temperature: 0.2,
      });
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as {
            platform?: string;
            topic?: string;
            tone?: string;
          };
          const draft = await this.deps.modules.invoke(
            'bellasos.social',
            'draft.create',
            {
              platform: parsed.platform ?? 'linkedin',
              topic: parsed.topic ?? prompt,
              tone: parsed.tone ?? 'professional',
            },
            task,
          );
          return { output: draft as Record<string, unknown> };
        } catch {
          /* fall through */
        }
      }
    }

    const res = await this.deps.ai.complete({
      taskType: 'general',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are a social media copywriter. Draft an on-brand post for the requested platform. Keep within platform norms.',
        },
        { role: 'user', content: prompt || JSON.stringify(task.input) },
      ],
    });
    return { output: { draft: res.text } };
  }
}

export class OperationsAgent extends BaseAgent {
  readonly type: AgentType = 'operations';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? '').trim();
    if (!prompt) {
      return {
        output: {
          status: 'ok',
          checkedAt: new Date().toISOString(),
          note: 'operations health summary placeholder',
        },
      };
    }
    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are an operations agent. Produce a concise, actionable response or plan for the request.',
        },
        { role: 'user', content: prompt },
      ],
    });
    return { output: { response: res.text, checkedAt: new Date().toISOString() } };
  }
}
