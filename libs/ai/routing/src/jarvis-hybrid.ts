import type { JarvisQueryTier, LocalModelHint } from './jarvis-hub';
import { getHybridProfile } from './hybrid-profile';

export type { LocalModelHint };
export type JarvisHybridMode = 'off' | 'openai-lead';

export interface JarvisTaskBrief {
  objective: string;
  deliverables: string[];
  approach: string[];
  localModelHint: LocalModelHint;
  constraints: string[];
  acceptanceCriteria: string[];
}

export interface JarvisReviewResult {
  passed: boolean;
  gaps: string[];
  strengths: string[];
}

export function getJarvisHybridMode(): JarvisHybridMode {
  const raw = (process.env.JARVIS_HYBRID_MODE ?? 'openai-lead').trim().toLowerCase();
  if (raw === 'off' || raw === 'false' || raw === '0') return 'off';
  return 'openai-lead';
}

/** @deprecated Use getHybridProfile().leadModel via hybrid-profile */
export function guideModelId(): string {
  return getHybridProfile().leadModel;
}

/** @deprecated Use getHybridProfile().leadMaxTokens */
export function guideMaxTokens(): number {
  return getHybridProfile().leadMaxTokens;
}

/** Cloud lead on standard/deep; fast tier included when premium profile enables it. */
export function shouldLeadWithCloud(tier: JarvisQueryTier): boolean {
  const profile = getHybridProfile(tier);
  if (profile.leadFastTier) return true;
  return tier === 'standard' || tier === 'deep';
}

export function buildGuidePrompt(
  message: string,
  opts?: {
    historyBlock?: string;
    contextBlock?: string;
    includeAcceptanceCriteria?: boolean;
  },
): string {
  const includeCriteria = opts?.includeAcceptanceCriteria ?? getHybridProfile().reviewEnabled;
  const parts = [
    'You are the task lead for Jarvis (BellasOS). Do NOT answer the user.',
    'Return ONLY valid JSON (no markdown fences) with this shape:',
    '{',
    '  "objective": "one clear sentence",',
    '  "deliverables": ["what the user should receive"],',
    '  "approach": ["ordered steps for the executor model"],',
    '  "localModelHint": "coding" | "general" | "vision",',
    '  "constraints": ["tone, length, format, or scope notes"],',
    includeCriteria
      ? '  "acceptanceCriteria": ["testable checks the final answer must satisfy"]'
      : '  "acceptanceCriteria": []',
    '}',
    '',
    `User request:\n${message.trim()}`,
  ];
  if (opts?.historyBlock?.trim()) {
    parts.push('', `Recent conversation:\n${opts.historyBlock.trim()}`);
  }
  if (opts?.contextBlock?.trim()) {
    parts.push('', `Operating context:\n${opts.contextBlock.trim()}`);
  }
  if (includeCriteria) {
    parts.push(
      '',
      'Make acceptanceCriteria specific and verifiable (structure, coverage, tone, citations if needed).',
    );
  }
  return parts.join('\n');
}

export function buildReviewPrompt(brief: JarvisTaskBrief, draft: string): string {
  const criteria =
    brief.acceptanceCriteria.length > 0
      ? brief.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : brief.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n');

  return [
    'Review the draft against the task brief.',
    'Return ONLY valid JSON (no markdown fences):',
    '{',
    '  "passed": true | false,',
    '  "gaps": ["specific missing or weak items — empty if passed"],',
    '  "strengths": ["what works well"]',
    '}',
    '',
    `Objective: ${brief.objective}`,
    '',
    'Acceptance criteria:',
    criteria,
    brief.constraints.length > 0 ? `\nConstraints:\n${brief.constraints.map((c) => `- ${c}`).join('\n')}` : '',
    '',
    'Draft to review:',
    draft,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatRefinePrompt(gaps: string[]): string {
  if (gaps.length === 0) return '';
  return [
    'REVISION REQUIRED — address every gap below in your updated reply:',
    ...gaps.map((g, i) => `${i + 1}. ${g}`),
  ].join('\n');
}

function normalizeHint(raw: unknown): LocalModelHint {
  const v = String(raw ?? 'general').toLowerCase();
  if (v === 'coding' || v === 'code') return 'coding';
  if (v === 'vision' || v === 'image') return 'vision';
  return 'general';
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

/** Parse the cloud lead planner JSON; returns null if invalid. */
export function parseTaskBrief(text: string): JarvisTaskBrief | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const json = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    const objective = String(json.objective ?? '').trim();
    if (!objective) return null;

    return {
      objective,
      deliverables: asStringList(json.deliverables),
      approach: asStringList(json.approach),
      localModelHint: normalizeHint(json.localModelHint),
      constraints: asStringList(json.constraints),
      acceptanceCriteria: asStringList(json.acceptanceCriteria),
    };
  } catch {
    return null;
  }
}

export function parseReviewResult(text: string): JarvisReviewResult | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const json = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    return {
      passed: json.passed === true,
      gaps: asStringList(json.gaps),
      strengths: asStringList(json.strengths),
    };
  } catch {
    return null;
  }
}

export function formatTaskBriefForPrompt(brief: JarvisTaskBrief): string {
  const lines = [
    'TASK BRIEF (from lead planner — follow this structure in your reply):',
    `Objective: ${brief.objective}`,
  ];
  if (brief.deliverables.length > 0) {
    lines.push('Deliverables:');
    for (const d of brief.deliverables) lines.push(`- ${d}`);
  }
  if (brief.approach.length > 0) {
    lines.push('Approach:');
    brief.approach.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  if (brief.constraints.length > 0) {
    lines.push('Constraints:');
    for (const c of brief.constraints) lines.push(`- ${c}`);
  }
  if (brief.acceptanceCriteria.length > 0) {
    lines.push('You must satisfy:');
    for (const c of brief.acceptanceCriteria) lines.push(`- ${c}`);
  }
  lines.push(
    'Produce the complete user-facing response. Do not mention this brief, routing, or internal models.',
  );
  return lines.join('\n');
}
