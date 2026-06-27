import {
  buildJarvisApplicationCatalog,
  ADVISORY_PLAYBOOKS,
} from '@bellasos/contracts';

export function buildExecutionPlanPrompt(input: {
  message: string;
  historyBlock?: string;
  contextBlock?: string;
  pendingSummary?: string;
}): string {
  const catalog = buildJarvisApplicationCatalog();
  const playbooks = ADVISORY_PLAYBOOKS;
  const playbookBlock =
    playbooks.length > 0
      ? playbooks
          .map(
            (p) =>
              `- ${p.id} (${p.domain}): triggers e.g. "${p.triggerExamples.slice(0, 2).join('", "')}"; ` +
              `fetch [${p.suggestedContextFetches.join(', ')}]; ` +
              `needs user inputs: [${p.requiredUserInputs.join(', ')}]; ` +
              `guide: ${p.synthesisGuide}`,
          )
          .join('\n')
      : '(none)';

  const parts = [
    'You are the cognition lead for Jarvis (BellasOS). Plan how to handle the user message.',
    'Do NOT answer the user directly. Return ONLY valid JSON (no markdown fences).',
    '',
    'Schema:',
    '{',
    '  "objective": "one clear sentence — what the user actually wants",',
    '  "queryKind": "lookup" | "advisory" | "write" | "navigate" | "chat",',
    '  "handler": {',
    '    "type": "gather_and_synthesize" | "capability_read" | "capability_write" | "open_app" | "clarify" | "agent_write",',
    '    "capabilityId": "optional registry capability id",',
    '    "agentType": "optional agent for complex writes e.g. finance, coding",',
    '    "openApp": "optional app id to open"',
    '  },',
    '  "contextFetches": [{ "capabilityId": "string", "label": "string", "required": true|false }],',
    '  "parsedUserInputs": { "key": "value extracted from message" },',
    '  "missingUserInputs": ["field names still needed from user"],',
    '  "clarifyingQuestions": ["max 2 plain questions if missingUserInputs non-empty"],',
    '  "synthesisGuide": "how to reason with gathered live data when answering",',
    '  "deliverables": ["what user should receive"],',
    '  "acceptanceCriteria": ["testable checks final answer must satisfy"],',
    '  "constraints": ["tone, scope, ZAR/SA context, brevity"],',
    '  "localModelHint": "coding" | "general" | "vision"',
    '}',
    '',
    'Decision rules:',
    '1. lookup — user asks for THEIR live data ("my debt", "net worth", "show holdings") → handler.type capability_read, minimal contextFetches.',
    '2. advisory — planning/hypothetical ("optimal deposit", "should I", "can I afford", property purchase) → gather_and_synthesize + relevant contextFetches from playbooks. NEVER fetch liabilities.list alone for deposit/advice questions.',
    '3. write — record transaction, log expense, buy shares with amount → capability_write or agent_write finance/coding.',
    '4. navigate — open/show app → open_app.',
    '5. chat — general knowledge, greetings with substance, opinions → gather_and_synthesize with empty contextFetches OR capability_read if none needed.',
    '6. Parse amounts from message (e.g. R1.6m → purchasePrice: 1600000) into parsedUserInputs.',
    '7. If required inputs missing for advisory, set clarifyingQuestions (max 2) — do not guess bond rate or term.',
    '8. acceptanceCriteria must include "Answers the user question directly" for advisory.',
    '',
    catalog,
    '',
    'Advisory playbooks (hints — use when message matches):',
    playbookBlock,
  ];

  if (input.pendingSummary?.trim()) {
    parts.push('', `Resuming pending execution:\n${input.pendingSummary.trim()}`);
  }
  if (input.contextBlock?.trim()) {
    parts.push('', `Operating context:\n${input.contextBlock.trim()}`);
  }
  if (input.historyBlock?.trim()) {
    parts.push('', `Recent conversation:\n${input.historyBlock.trim()}`);
  }
  parts.push('', `Current user message:\n${input.message.trim()}`);
  return parts.join('\n');
}

export function formatContextBundleForPrompt(bundle: {
  entries: Array<{ label: string; capabilityId: string; data: unknown; error?: string }>;
  fetchedAt: string;
}): string {
  const lines = [`Live context gathered at ${bundle.fetchedAt}:`];
  for (const entry of bundle.entries) {
    if (entry.error) {
      lines.push(`- ${entry.label} (${entry.capabilityId}): unavailable — ${entry.error}`);
      continue;
    }
    lines.push(`- ${entry.label} (${entry.capabilityId}):\n${JSON.stringify(entry.data, null, 2)}`);
  }
  return lines.join('\n');
}

export function formatExecutionPlanForExecutor(plan: {
  objective: string;
  synthesisGuide: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  parsedUserInputs: Record<string, unknown>;
}): string {
  const lines = [
    'EXECUTION PLAN (follow precisely):',
    `Objective: ${plan.objective}`,
    plan.synthesisGuide ? `Synthesis guide: ${plan.synthesisGuide}` : '',
  ];
  if (Object.keys(plan.parsedUserInputs).length > 0) {
    lines.push(`User inputs: ${JSON.stringify(plan.parsedUserInputs)}`);
  }
  if (plan.deliverables.length) {
    lines.push('Deliverables:', ...plan.deliverables.map((d) => `- ${d}`));
  }
  if (plan.constraints.length) {
    lines.push('Constraints:', ...plan.constraints.map((c) => `- ${c}`));
  }
  if (plan.acceptanceCriteria.length) {
    lines.push('Must satisfy:', ...plan.acceptanceCriteria.map((c) => `- ${c}`));
  }
  lines.push(
    'Use ONLY the live context data provided when citing household figures.',
    'For property deposit advice: compare bond cost vs portfolio return when both are available; factor existing debt and liquidity.',
    'Do not answer with generic "10–20%" ranges alone — give a specific recommendation with reasoning.',
    'Produce the complete user-facing reply. Do not mention plans, routing, or models.',
  );
  return lines.filter(Boolean).join('\n');
}
