"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsAgent = exports.SocialAgent = exports.AutomationAgent = exports.FinanceAgent = exports.PortfolioAgent = exports.CodingAgent = void 0;
const agents_framework_1 = require("@bellasos/agents-framework");
const finance_math_1 = require("./finance-math");
const finance_investment_1 = require("./finance-investment");
function looksLikeRefine(prompt) {
    return /\b(fix|update|edit|change|improve|refine|modify|adjust|arrow keys|keyboard|controls|not working|doesn'?t work|broken|bug)\b/i.test(prompt);
}
function looksLikeBuild(prompt) {
    return /\b(build|create|make|write|develop|implement|game|snake|pong|html|app|playable)\b/i.test(prompt);
}
class CodingAgent extends agents_framework_1.BaseAgent {
    type = 'coding';
    async execute(task) {
        const prompt = String(task.input.prompt ?? task.input.goal ?? '').trim();
        const projectId = task.input.projectId;
        if (this.deps.modules && prompt) {
            if (looksLikeRefine(prompt) || task.input.refine) {
                if (!projectId) {
                    throw new Error('Select a project in Coding Studio before applying edits.');
                }
                const result = await this.deps.modules.invoke('bellasos.coding', 'task.refine', { prompt, projectId }, task);
                return { output: result };
            }
            if ((looksLikeBuild(prompt) || task.input.executePipeline) && !looksLikeRefine(prompt)) {
                const result = await this.deps.modules.invoke('bellasos.coding', 'task.execute', { goal: prompt }, task);
                return { output: result };
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
exports.CodingAgent = CodingAgent;
class PortfolioAgent extends agents_framework_1.BaseAgent {
    type = 'portfolio';
    async execute(task) {
        const prompt = String(task.input.prompt ?? '').trim();
        if (this.deps.modules) {
            if (/\b(analyz|summary|allocation|holdings|watchlist|portfolio)\b/i.test(prompt) || !prompt) {
                const result = await this.deps.modules.invoke('bellasos.portfolio', 'analyze', {}, task);
                return { output: result };
            }
        }
        const res = await this.deps.ai.complete({
            taskType: 'reasoning',
            traceId: task.traceId,
            messages: [
                {
                    role: 'system',
                    content: 'You are a portfolio analyst. Comment on allocation, risk and notable changes for the request below.',
                },
                { role: 'user', content: prompt || JSON.stringify(task.input) },
            ],
        });
        return { output: { analysis: res.text } };
    }
}
exports.PortfolioAgent = PortfolioAgent;
function friendlyFinanceConnectionError(message) {
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect ETIMEDOUT/i.test(message)) {
        return 'Finance-Tracker is not running. Start it on port 5000 (`cd Finance-Tracker && npm run dev`), then try again.';
    }
    return message;
}
class FinanceAgent extends agents_framework_1.BaseAgent {
    type = 'finance';
    async finance(action, input, task) {
        if (!this.deps.modules)
            throw new Error('Module gateway unavailable');
        try {
            return (await this.deps.modules.invoke('bellasos.finance-tracker', action, input, task));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(friendlyFinanceConnectionError(message));
        }
    }
    async planFinanceAction(prompt, task) {
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
            const parsed = JSON.parse(match[0]);
            return {
                action: parsed.action ?? 'answer',
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
                needsClarification: Boolean(parsed.needsClarification),
                clarifyingQuestions: parsed.clarifyingQuestions?.filter(Boolean),
                reply: parsed.reply?.trim(),
                extractedInput: parsed.extractedInput,
            };
        }
        catch {
            return { action: 'answer', confidence: 0.4, needsClarification: false };
        }
    }
    async writeFromPrompt(action, prompt, task, prefilled) {
        if (prefilled && Object.keys(prefilled).length > 0) {
            try {
                const recorded = await this.finance(action, prefilled, task);
                return { output: { recorded, action } };
            }
            catch (err) {
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
                    content: action === 'expenses.add'
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
            const parsed = JSON.parse(match[0]);
            const recorded = await this.finance(action, parsed, task);
            return { output: { recorded, action } };
        }
        catch (err) {
            return {
                output: {
                    error: err instanceof Error ? err.message : String(err),
                    action,
                },
            };
        }
    }
    async resolveSymbolLive(query, task) {
        const q = query.trim();
        if (q.length < 2)
            return null;
        const results = (await this.finance('investments.search', { query: q }, task));
        if (!Array.isArray(results) || results.length === 0)
            return null;
        if (results.length === 1)
            return results[0];
        const upper = q.toUpperCase();
        const exact = results.find((r) => r.symbol.toUpperCase() === upper);
        if (exact)
            return exact;
        return { ambiguous: results.slice(0, 5) };
    }
    async writeInvestmentFromPrompt(prompt, task, prefilled) {
        let parsed = prefilled && Object.keys(prefilled).length > 0 ? prefilled : null;
        if (!parsed) {
            const res = await this.deps.ai.complete({
                taskType: 'reasoning',
                traceId: task.traceId,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract an investment purchase (smart transaction) from the user message. Return ONLY JSON: {"symbol":"ticker or company name","name":"Company name","amountZar":number|null,"quantity":number|null,"purchasePrice":number|null,"purchaseDate":"YYYY-MM-DD","investmentType":"stock","accountType":"TFSA|taxable|RA","description":"string"}. Use amountZar for Rand amounts. Put company name or ticker in symbol/name — live Finance-Tracker search resolves the ticker. Parse "yesterday"/"today" to ISO dates. Leave purchasePrice null for opening-price purchases. Default accountType TFSA. Never ask for stock price or exchange rate.',
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
            parsed = JSON.parse(match[0]);
        }
        try {
            const searchQuery = String(parsed.symbol ?? '').trim() ||
                String(parsed.name ?? '').trim() ||
                (0, finance_investment_1.extractSecurityQuery)(prompt) ||
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
            const payload = {
                symbol: resolved.symbol,
                name: parsed.name ? String(parsed.name) : resolved.name,
                investmentType: parsed.investmentType ? String(parsed.investmentType) : 'stock',
                accountType: parsed.accountType ? String(parsed.accountType) : 'TFSA',
                purchaseDate: parsed.purchaseDate ? String(parsed.purchaseDate) : (0, finance_investment_1.parsePurchaseDate)(prompt) ?? undefined,
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
            const rec = recorded;
            const priceNote = rec.purchase_price != null
                ? ` at $${Number(rec.purchase_price).toFixed(2)} open (${rec.quantity ?? '?'} shares)`
                : '';
            return {
                output: {
                    recorded,
                    action: 'investments.add',
                    message: `Done — recorded smart transaction: ${payload.amountZar ? `R${payload.amountZar} of ` : ''}${payload.symbol}${dateNote}${priceNote}.`,
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                output: {
                    error: friendlyFinanceConnectionError(message),
                    action: 'investments.add',
                },
            };
        }
    }
    formatClarification(plan) {
        const questions = plan.clarifyingQuestions?.filter(Boolean) ?? [];
        const reply = plan.reply?.trim() ||
            (questions.length > 0
                ? questions[0]
                : 'Could you give me a bit more detail so I can record that correctly?');
        return {
            output: {
                message: reply,
                needsClarification: true,
                clarifyingQuestions: questions,
            },
        };
    }
    isWriteAction(action) {
        return action === 'investments.add' || action === 'expenses.add' || action === 'income.add';
    }
    hasInvestmentCoreInput(input) {
        if (!input)
            return false;
        const symbol = String(input.symbol ?? '').trim();
        const amountZar = typeof input.amountZar === 'number' ? input.amountZar : null;
        const quantity = typeof input.quantity === 'number' ? input.quantity : null;
        return symbol.length > 0 && ((amountZar != null && amountZar > 0) || (quantity != null && quantity > 0));
    }
    shouldClarifyInvestment(plan, prompt) {
        if (this.hasInvestmentCoreInput(plan.extractedInput))
            return false;
        const questions = (plan.clarifyingQuestions ?? []).filter((q) => q && !(0, finance_math_1.isLiveMarketDataQuestion)(q) && !(0, finance_investment_1.isAccountMetadataQuestion)(q));
        if (plan.reply && ((0, finance_math_1.isLiveMarketDataQuestion)(plan.reply) || (0, finance_investment_1.isAccountMetadataQuestion)(plan.reply))) {
            return questions.length > 0;
        }
        if ((0, finance_math_1.looksLikeInvestmentWrite)(prompt) && /\d[\d,]*\s*(rand|r\b)/i.test(prompt)) {
            return questions.some((q) => /\b(which stock|what stock|which company|ticker|symbol)\b/i.test(q));
        }
        return (plan.needsClarification || plan.confidence < 0.65) && questions.length > 0;
    }
    async answerWithLiveMath(prompt, task) {
        const facts = (0, finance_math_1.extractFinanceMathFacts)(prompt);
        const exchange = await this.finance('currency.exchangeRate.get', facts.date ? { date: facts.date } : {}, task);
        const rate = Number(exchange.rate);
        if (!Number.isFinite(rate) || rate <= 0) {
            return {
                output: {
                    error: 'Could not fetch live USD/ZAR rate from Finance-Tracker.',
                },
            };
        }
        let quote;
        if (facts.wantsShareEstimate) {
            const query = facts.symbol ?? (0, finance_investment_1.extractSecurityQuery)(prompt);
            if (query) {
                const resolved = await this.resolveSymbolLive(query, task);
                if (resolved && !('ambiguous' in resolved)) {
                    quote = (await this.finance('investments.quote.get', { symbol: resolved.symbol, date: facts.date ?? undefined }, task));
                }
            }
        }
        const result = (0, finance_math_1.buildFinanceMathMessage)({
            facts,
            rate,
            rateSource: exchange.source,
            quote,
        });
        const message = (0, finance_math_1.plainFinanceMathMessage)(result.message);
        return {
            output: {
                answer: message,
                message,
                computed: result.computed,
                mathFromLiveData: true,
            },
        };
    }
    async execute(task) {
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
                    error: 'Finance-Tracker is not reachable. Connect it in Command Centre → Portfolio with your API key.',
                    status,
                },
            };
        }
        if (!prompt) {
            const summary = await this.finance('summary.get', {}, task);
            return { output: summary };
        }
        const plan = await this.planFinanceAction(prompt, task);
        const investmentWrite = plan.action === 'investments.add' ||
            ((0, finance_math_1.looksLikeInvestmentWrite)(prompt) && !this.isWriteAction(plan.action));
        if (investmentWrite) {
            if (this.shouldClarifyInvestment(plan, prompt)) {
                return this.formatClarification(plan);
            }
            return this.writeInvestmentFromPrompt(prompt, task, plan.extractedInput);
        }
        if (plan.needsClarification) {
            return this.formatClarification(plan);
        }
        if ((0, finance_math_1.looksLikeFinanceMath)(prompt) && !this.isWriteAction(plan.action)) {
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
                if ((0, finance_math_1.looksLikeFinanceMath)(prompt)) {
                    return this.answerWithLiveMath(prompt, task);
                }
                const summary = await this.finance('summary.get', {}, task);
                const res = await this.deps.ai.complete({
                    taskType: 'reasoning',
                    traceId: task.traceId,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a personal finance assistant. Answer using the live Finance-Tracker summary provided. Amounts are ZAR unless stated otherwise. Be concise and actionable. Never guess currency conversions or share counts — those are computed elsewhere.',
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
exports.FinanceAgent = FinanceAgent;
class AutomationAgent extends agents_framework_1.BaseAgent {
    type = 'automation';
    async execute(task) {
        const prompt = String(task.input.prompt ?? task.input.intent ?? '').trim();
        if (this.deps.modules && prompt) {
            if (/\b(list|show|what).*\b(device|light|lights|home)\b/i.test(prompt) || !prompt) {
                const devices = await this.deps.modules.invoke('bellasos.automation', 'devices.list', {}, task);
                return { output: { devices } };
            }
            const res = await this.deps.ai.complete({
                taskType: 'reasoning',
                traceId: task.traceId,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract a smart-home control command. Return ONLY JSON: {"entityId":"string or empty","action":"turn_on|turn_off|toggle","deviceName":"string"}. If entityId unknown, leave empty and set deviceName.',
                    },
                    { role: 'user', content: prompt },
                ],
                maxTokens: 180,
                temperature: 0.1,
            });
            const match = res.text.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[0]);
                    let entityId = parsed.entityId?.trim();
                    if (!entityId) {
                        const devices = (await this.deps.modules.invoke('bellasos.automation', 'devices.list', {}, task));
                        const name = parsed.deviceName?.toLowerCase();
                        entityId = devices.find((d) => d.name.toLowerCase().includes(name ?? ''))?.entityId;
                    }
                    if (entityId && parsed.action) {
                        const result = await this.deps.modules.invoke('bellasos.automation', 'device.control', { entityId, action: parsed.action }, task);
                        return { output: result };
                    }
                }
                catch {
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
exports.AutomationAgent = AutomationAgent;
class SocialAgent extends agents_framework_1.BaseAgent {
    type = 'social';
    async execute(task) {
        const prompt = String(task.input.prompt ?? '').trim();
        if (this.deps.modules && /\b(draft|post|write|create|schedule|publish)\b/i.test(prompt)) {
            const res = await this.deps.ai.complete({
                taskType: 'general',
                traceId: task.traceId,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract social post intent. Return ONLY JSON: {"platform":"twitter|linkedin|facebook|instagram","topic":"string","tone":"professional|casual|witty"}',
                    },
                    { role: 'user', content: prompt },
                ],
                maxTokens: 160,
                temperature: 0.2,
            });
            const match = res.text.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[0]);
                    const draft = await this.deps.modules.invoke('bellasos.social', 'draft.create', {
                        platform: parsed.platform ?? 'linkedin',
                        topic: parsed.topic ?? prompt,
                        tone: parsed.tone ?? 'professional',
                    }, task);
                    return { output: draft };
                }
                catch {
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
                    content: 'You are a social media copywriter. Draft an on-brand post for the requested platform. Keep within platform norms.',
                },
                { role: 'user', content: prompt || JSON.stringify(task.input) },
            ],
        });
        return { output: { draft: res.text } };
    }
}
exports.SocialAgent = SocialAgent;
class OperationsAgent extends agents_framework_1.BaseAgent {
    type = 'operations';
    async execute(task) {
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
                    content: 'You are an operations agent. Produce a concise, actionable response or plan for the request.',
                },
                { role: 'user', content: prompt },
            ],
        });
        return { output: { response: res.text, checkedAt: new Date().toISOString() } };
    }
}
exports.OperationsAgent = OperationsAgent;
//# sourceMappingURL=additional-agents.js.map