/**
 * World intelligence types for external signal monitoring and relevance.
 */

export const WORLD_SECTORS = [
  'ai',
  'technology',
  'energy',
  'mining',
  'space',
  'telecommunications',
  'healthcare',
  'markets',
  'macroeconomics',
  'south_africa',
  'user_business',
  'user_investments',
  'user_research',
  'user_projects',
] as const;

export type WorldSector = (typeof WORLD_SECTORS)[number];

export const WORLD_SIGNAL_KINDS = [
  'news',
  'market_move',
  'filing',
  'trend',
  'alert_match',
  'pattern',
  'forecast',
] as const;

export type WorldSignalKind = (typeof WORLD_SIGNAL_KINDS)[number];

export const WORLD_OPPORTUNITY_KINDS = [
  'emerging_opportunity',
  'emerging_risk',
  'competitive_move',
  'industry_shift',
  'technology_change',
  'investment_implication',
  'business_implication',
  'research_implication',
] as const;

export type WorldOpportunityKind = (typeof WORLD_OPPORTUNITY_KINDS)[number];

export interface WorldSignal {
  ingestDocId: string;
  sector: WorldSector;
  kind: WorldSignalKind;
  title: string;
  summary: string;
  source: string;
  url?: string;
  tags: string[];
  fetchedAt: string;
  baseScore: number;
}

export interface WorldRelevance {
  relevanceLine: string;
  audienceLine: string;
  goalIds: string[];
  initiativeIds: string[];
  decisionIds: string[];
  applicationIds: string[];
  researchIds: string[];
  projectIds: string[];
  affectedEntities: string[];
}

export interface WorldOpportunity {
  kind: WorldOpportunityKind;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  recommendedAction?: string;
}

export type WorldTrendDirection = 'up' | 'down' | 'flat' | 'volatile';

export interface WorldTrend {
  id: string;
  sector: WorldSector;
  direction: WorldTrendDirection;
  docCount: number;
  windowHours: number;
  summary: string;
  confidence: number;
  linkedGoalIds?: string[];
}

export interface WorldIntelligenceSummary {
  id: string;
  headline: string;
  sector: WorldSector;
  relevanceLine?: string;
  trendDirection?: WorldTrendDirection;
}

export interface WorldContext {
  trackedSectors: string[];
  symbols: string[];
  ventureKeywords: string[];
  researchTopics: string[];
  projectNames: string[];
  recentEnrichments: number;
}
