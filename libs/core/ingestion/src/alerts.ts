import type { IngestDocument } from './types';

export interface AlertRule {
  id: string;
  sector: string;
  keyword: string;
}

export interface AlertMatch {
  rule: AlertRule;
  document: IngestDocument;
}

export function evaluateAlerts(rules: AlertRule[], docs: IngestDocument[]): AlertMatch[] {
  const matches: AlertMatch[] = [];
  for (const rule of rules) {
    const sector = rule.sector.toLowerCase();
    const keyword = rule.keyword.toLowerCase();
    for (const doc of docs) {
      const hay = `${doc.title} ${doc.snippet} ${doc.body ?? ''} ${doc.tags.join(' ')}`.toLowerCase();
      if (hay.includes(sector) && hay.includes(keyword)) {
        matches.push({ rule, document: doc });
      }
    }
  }
  return matches;
}
