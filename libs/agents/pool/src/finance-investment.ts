/** Helpers that do not hardcode tickers — symbol resolution is live via Finance-Tracker search. */

const TICKER_STOPWORDS = new Set(['USD', 'ZAR', 'TFSA', 'RA', 'ETF']);

export function extractSecurityQuery(text: string): string | null {
  const ofShares = text.match(/\b(?:of|in|for)\s+([A-Za-z][\w\s&.]{1,40}?)\s+shares?\b/i);
  if (ofShares?.[1]) return ofShares[1].trim();

  const ticker = text.match(/\b([A-Z]{2,5})\b/);
  if (ticker?.[1] && !TICKER_STOPWORDS.has(ticker[1])) return ticker[1];

  const company = text.match(/\b([A-Za-z][\w&.]{2,30})\s+shares?\b/i);
  if (company?.[1]) return company[1].trim();

  return null;
}

export function isAccountMetadataQuestion(text: string): boolean {
  return /\b(account details|investment account|type of.*shares|specific type|which account|confirm your investment account)\b/i.test(
    text,
  );
}

export function parsePurchaseDate(text: string): string | null {
  const lower = text.toLowerCase();
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const now = new Date();
  if (/\byesterday\b/.test(lower)) {
    now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0]!;
  }
  if (/\btoday\b/.test(lower)) {
    return now.toISOString().split('T')[0]!;
  }
  return null;
}

export interface LiveSymbolMatch {
  symbol: string;
  name: string;
  exchange?: string | null;
}
