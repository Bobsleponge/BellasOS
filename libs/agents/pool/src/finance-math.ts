import { extractSecurityQuery } from './finance-investment';

/** Deterministic finance math using live Finance-Tracker rates — LLMs must not arithmetic here. */

export interface FinanceMathFacts {
  amountZar: number | null;
  amountUsd: number | null;
  symbol: string | null;
  date: string | null;
  wantsExchangeRate: boolean;
  wantsZarToUsd: boolean;
  wantsUsdToZar: boolean;
  wantsShareEstimate: boolean;
}

export function looksLikeFinanceMath(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return (
    /\b(exchange rate|usd\/zar|zar\/usd|convert|conversion|equivalent|in dollars|in usd|to usd|to zar|to rand)\b/.test(
      p,
    ) ||
    (/\b\d[\d,]*\s*(rand|r\b|zar)\b/.test(p) &&
      /\b(usd|dollar|convert|equivalent|worth|share|stock|nvidia|nvda|apple|aapl)\b/.test(p)) ||
    /\b(how much|what is).*\b(usd|dollar|rand|zar)\b/.test(p) ||
    /\b(correct|recalculate|wrong|incorrect).*\b(rate|convert|dollar|usd|rand)\b/.test(p)
  );
}

function parseAmount(text: string): number | null {
  const prefixed = text.match(/\bR\s*(\d[\d,]*(?:\.\d+)?)\b/i);
  if (prefixed?.[1]) {
    const n = Number(prefixed[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:rand|r\b|zar|usd|dollar|\$)/i);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseIsoDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const dmy = text.match(
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/i,
  );
  if (dmy) {
    const months: Record<string, string> = {
      january: '01',
      february: '02',
      march: '03',
      april: '04',
      may: '05',
      june: '06',
      july: '07',
      august: '08',
      september: '09',
      october: '10',
      november: '11',
      december: '12',
    };
    const mm = months[dmy[2]!.toLowerCase()];
    if (mm) return `${dmy[3]}-${mm}-${String(dmy[1]).padStart(2, '0')}`;
  }
  if (/\btoday\b/i.test(text)) {
    return new Date().toISOString().split('T')[0]!;
  }
  return null;
}

export function extractFinanceMathFacts(prompt: string): FinanceMathFacts {
  const lower = prompt.toLowerCase();
  const amountZar =
    parseAmount(prompt) ??
    (/\b\d[\d,]*\s*(rand|r\b|zar)\b/i.test(prompt) ? parseAmount(prompt) : null);
  const amountUsd = /\b\d[\d,]*\s*(usd|dollar|\$)/i.test(prompt)
    ? parseAmount(prompt.replace(/rand|zar|\br\b/gi, ''))
    : null;

  return {
    amountZar,
    amountUsd,
    symbol: extractSecurityQuery(prompt),
    date: parseIsoDate(prompt),
    wantsExchangeRate: /\b(exchange rate|usd\/zar|what.*rate|current rate)\b/i.test(lower),
    wantsZarToUsd:
      /\b(convert|equivalent|in dollars|in usd|to usd|back into dollars)\b/i.test(lower) ||
      (amountZar != null && /\b(dollar|usd|\$)\b/i.test(lower)),
    wantsUsdToZar: amountUsd != null && /\b(rand|zar|r\b)\b/i.test(lower),
    wantsShareEstimate:
      amountZar != null &&
      (/\b(share|shares|stock|stocks|nvidia|nvda|apple|aapl|bought|buy|purchase)\b/i.test(lower) ||
        extractSecurityQuery(prompt) != null),
  };
}

export interface FinanceMathResult {
  message: string;
  computed: Record<string, unknown>;
}

function fmtZar(n: number): string {
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildFinanceMathMessage(input: {
  facts: FinanceMathFacts;
  rate: number;
  rateSource?: string;
  quote?: { price?: number; open?: number; currency?: string; name?: string; symbol?: string };
}): FinanceMathResult {
  const { facts, rate, rateSource, quote } = input;
  const parts: string[] = [];
  const computed: Record<string, unknown> = {
    usdZarRate: rate,
    rateSource: rateSource ?? null,
  };

  if (facts.wantsExchangeRate || rate) {
    parts.push(`Live USD/ZAR: **${rate.toFixed(4)}**${rateSource ? ` (${rateSource})` : ''}.`);
  }

  if (facts.amountZar != null && (facts.wantsZarToUsd || facts.wantsShareEstimate)) {
    const usd = facts.amountZar / rate;
    computed.amountZar = facts.amountZar;
    computed.amountUsd = Math.round(usd * 100) / 100;
    parts.push(`${fmtZar(facts.amountZar)} = **${fmtUsd(usd)}** at ${rate.toFixed(4)} USD/ZAR.`);
  }

  if (facts.amountUsd != null && facts.wantsUsdToZar) {
    const zar = facts.amountUsd * rate;
    computed.amountUsd = facts.amountUsd;
    computed.amountZar = Math.round(zar * 100) / 100;
    parts.push(`${fmtUsd(facts.amountUsd)} = **${fmtZar(zar)}** at ${rate.toFixed(4)} USD/ZAR.`);
  }

  if (facts.amountZar != null && facts.wantsShareEstimate && quote) {
    const priceUsd = quote.open ?? quote.price;
    if (priceUsd && priceUsd > 0) {
      const currency = quote.currency ?? 'USD';
      const zarPerShare = currency === 'ZAR' ? priceUsd : priceUsd * rate;
      const shares = facts.amountZar / zarPerShare;
      computed.symbol = quote.symbol ?? facts.symbol;
      computed.priceUsd = priceUsd;
      computed.zarPerShare = Math.round(zarPerShare * 100) / 100;
      computed.estimatedShares = Math.round(shares * 10000) / 10000;
      parts.push(
        `${quote.name ?? quote.symbol ?? facts.symbol}: ${currency === 'ZAR' ? fmtZar(priceUsd) : fmtUsd(priceUsd)} per share -> about **${computed.estimatedShares} shares** for ${fmtZar(facts.amountZar)} (~${fmtZar(zarPerShare)}/share in ZAR).`,
      );
    }
  }

  if (parts.length === 0) {
    parts.push(`Live USD/ZAR is ${rate.toFixed(4)}. Tell me a Rand or USD amount to convert.`);
  }

  return { message: parts.join(' '), computed };
}

export function plainFinanceMathMessage(message: string): string {
  return message.replace(/\*\*/g, '');
}

export function isLiveMarketDataQuestion(text: string): boolean {
  return /\b(stock price|share price|opening price|open price|exchange rate|usd\/zar|market data|real-?time access|current price|provide.*price|confirm.*price|in south african rands)\b/i.test(
    text,
  );
}

export function looksLikeInvestmentWrite(prompt: string): boolean {
  return (
    /\bsmart transaction\b/i.test(prompt) ||
    (/\b(log|record|add|create|make|buy|purchase|initiate|do)\b/i.test(prompt) &&
      /\b(stock|share|shares|investment|transaction|intel|nvidia|nvda|apple|aapl|\d+\s*(rand|r\b)|r\s*\d)/i.test(
        prompt,
      ))
  );
}

/** Last segment of a Jarvis contextual prompt — the current user turn only. */
export function extractLatestUserTurn(contextualPrompt: string): string {
  const trimmed = contextualPrompt.trim();
  if (!trimmed) return '';
  return trimmed.split(/\n\n/).pop()?.trim() ?? trimmed;
}

export type FinanceReadAction =
  | 'summary.get'
  | 'liabilities.list'
  | 'assets.list'
  | 'investments.list'
  | 'transactions.recent';

/** Read-only finance questions — route without LLM action planning. */
export function looksLikeFinanceReadOnly(prompt: string): boolean {
  const turn = extractLatestUserTurn(prompt);
  if (looksLikeInvestmentWrite(turn)) return false;
  if (/\b(log|record|add|create|buy|purchase|sell|smart transaction)\b/i.test(turn)) return false;
  return (
    /\b(debt|debts|liabilit|loan|mortgage|owe|owing|what do i owe|how much do i owe|how much debt|my debts)\b/i.test(
      turn,
    ) ||
    /\b(net worth|how much am i worth|what am i worth|tell me my net worth)\b/i.test(turn) ||
    /\b(my assets|list assets|show assets)\b/i.test(turn) ||
    /\b(my investments|my holdings|show holdings|list holdings|what do i own)\b/i.test(turn) ||
    /\b(recent transactions|recent spending|what did i spend)\b/i.test(turn)
  );
}

/** Pick a Finance-Tracker read action from the user message (no LLM). */
export function resolveFinanceReadAction(prompt: string): FinanceReadAction | null {
  const turn = extractLatestUserTurn(prompt);
  if (!looksLikeFinanceReadOnly(turn)) return null;

  if (
    /\b(debt|debts|liabilit|loan|mortgage|owe|owing|what do i owe|how much do i owe|how much debt|my debts)\b/i.test(
      turn,
    )
  ) {
    return /\b(list|show|breakdown|details|all my)\b/i.test(turn) ? 'liabilities.list' : 'summary.get';
  }
  if (/\b(my assets|list assets|show assets)\b/i.test(turn)) return 'assets.list';
  if (/\b(my investments|my holdings|show holdings|list holdings|what do i own)\b/i.test(turn)) {
    return 'investments.list';
  }
  if (/\b(recent transactions|recent spending|what did i spend)\b/i.test(turn)) {
    return 'transactions.recent';
  }
  return 'summary.get';
}
