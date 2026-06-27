import { describe, expect, it } from 'vitest';
import { getHybridProfile } from './hybrid-profile';
import {
  buildGuidePrompt,
  buildReviewPrompt,
  formatTaskBriefForPrompt,
  getJarvisHybridMode,
  parseReviewResult,
  parseTaskBrief,
  shouldLeadWithCloud,
} from './jarvis-hybrid';

describe('Jarvis hybrid', () => {
  it('defaults to openai-lead mode', () => {
    const prev = process.env.JARVIS_HYBRID_MODE;
    delete process.env.JARVIS_HYBRID_MODE;
    expect(getJarvisHybridMode()).toBe('openai-lead');
    process.env.JARVIS_HYBRID_MODE = prev;
  });

  it('premium profile enables review and higher token budgets', () => {
    const prev = process.env.HYBRID_PROFILE;
    process.env.HYBRID_PROFILE = 'premium';
    const profile = getHybridProfile('deep');
    expect(profile.leadModel).toBe('gpt-4o');
    expect(profile.reviewEnabled).toBe(true);
    expect(profile.leadMaxTokens).toBeGreaterThanOrEqual(1000);
    process.env.HYBRID_PROFILE = prev;
  });

  it('leads fast tier when premium profile sets leadFastTier', () => {
    const prev = process.env.HYBRID_PROFILE;
    process.env.HYBRID_PROFILE = 'premium';
    expect(shouldLeadWithCloud('fast')).toBe(true);
    process.env.HYBRID_PROFILE = 'economy';
    expect(shouldLeadWithCloud('fast')).toBe(false);
    process.env.HYBRID_PROFILE = prev;
  });

  it('parses a task brief from JSON', () => {
    const brief = parseTaskBrief(`{
      "objective": "Summarize PGM outlook",
      "deliverables": ["3 bullet trends", "one risk"],
      "approach": ["gather themes", "write concise summary"],
      "localModelHint": "general",
      "constraints": ["under 200 words"],
      "acceptanceCriteria": ["3 trends", "1 risk"]
    }`);
    expect(brief?.objective).toContain('PGM');
    expect(brief?.deliverables).toHaveLength(2);
    expect(brief?.acceptanceCriteria).toHaveLength(2);
    expect(brief?.localModelHint).toBe('general');
  });

  it('parses review JSON', () => {
    const review = parseReviewResult(`{
      "passed": false,
      "gaps": ["missing risk section"],
      "strengths": ["clear structure"]
    }`);
    expect(review?.passed).toBe(false);
    expect(review?.gaps).toHaveLength(1);
  });

  it('formats brief for the local executor', () => {
    const text = formatTaskBriefForPrompt({
      objective: 'Draft email',
      deliverables: ['subject', 'body'],
      approach: ['outline', 'write'],
      localModelHint: 'general',
      constraints: ['professional tone'],
      acceptanceCriteria: ['has subject line'],
    });
    expect(text).toContain('TASK BRIEF');
    expect(text).toContain('You must satisfy');
  });

  it('builds guide and review prompts', () => {
    const guide = buildGuidePrompt('Research mining', {
      historyBlock: 'User asked about gold before',
      includeAcceptanceCriteria: true,
    });
    expect(guide).toContain('Research mining');
    expect(guide).toContain('acceptanceCriteria');

    const brief = parseTaskBrief(`{
      "objective": "Test",
      "deliverables": ["a"],
      "approach": ["b"],
      "localModelHint": "general",
      "constraints": [],
      "acceptanceCriteria": ["covers a"]
    }`)!;
    const review = buildReviewPrompt(brief, 'draft text');
    expect(review).toContain('Draft to review');
  });
});
