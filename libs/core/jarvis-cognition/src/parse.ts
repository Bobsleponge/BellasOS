import type { JarvisExecutionPlan, JarvisHandlerType, JarvisQueryKind } from './types';

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

const FINANCE_SUMMARY_CAPABILITY = 'wealth.summary.get';

/** Capabilities that must succeed for advisory answers grounded in household data. */
const ADVISORY_REQUIRED_CAPABILITIES = new Set([FINANCE_SUMMARY_CAPABILITY]);

function defaultRequiredForFetch(capabilityId: string, queryKind: JarvisQueryKind): boolean {
  if (queryKind !== 'advisory') {
    return capabilityId === FINANCE_SUMMARY_CAPABILITY;
  }
  return ADVISORY_REQUIRED_CAPABILITIES.has(capabilityId);
}

export function normalizeExecutionPlan(plan: JarvisExecutionPlan): JarvisExecutionPlan {
  return {
    ...plan,
    contextFetches: plan.contextFetches.map((fetch) => ({
      ...fetch,
      required: defaultRequiredForFetch(fetch.capabilityId, plan.queryKind),
    })),
  };
}

const QUERY_KINDS = new Set<JarvisQueryKind>(['lookup', 'advisory', 'write', 'navigate', 'chat']);
const HANDLER_TYPES = new Set<JarvisHandlerType>([
  'gather_and_synthesize',
  'capability_read',
  'capability_write',
  'open_app',
  'clarify',
  'agent_write',
]);

function normalizeHandlerType(raw: unknown): JarvisHandlerType {
  const v = String(raw ?? 'gather_and_synthesize').trim() as JarvisHandlerType;
  return HANDLER_TYPES.has(v) ? v : 'gather_and_synthesize';
}

function normalizeQueryKind(raw: unknown): JarvisQueryKind {
  const v = String(raw ?? 'chat').trim() as JarvisQueryKind;
  return QUERY_KINDS.has(v) ? v : 'chat';
}

function normalizeHint(raw: unknown): 'coding' | 'general' | 'vision' {
  const v = String(raw ?? 'general').toLowerCase();
  if (v === 'coding' || v === 'code') return 'coding';
  if (v === 'vision' || v === 'image') return 'vision';
  return 'general';
}

export function parseExecutionPlan(text: string): JarvisExecutionPlan | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const json = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    const objective = String(json.objective ?? '').trim();
    if (!objective) return null;

    const handlerRaw = asRecord(json.handler);
    const contextFetchesRaw = Array.isArray(json.contextFetches) ? json.contextFetches : [];

    const contextFetches = contextFetchesRaw
      .map((item) => {
        const row = asRecord(item);
        const capabilityId = String(row.capabilityId ?? '').trim();
        if (!capabilityId) return null;
        return {
          capabilityId,
          label: String(row.label ?? capabilityId).trim(),
          required: row.required === true,
        };
      })
      .filter(Boolean) as JarvisExecutionPlan['contextFetches'];

    const missingUserInputs = asStringList(json.missingUserInputs).slice(0, 8);
    let clarifyingQuestions = asStringList(json.clarifyingQuestions).slice(0, 2);
    if (missingUserInputs.length > 0 && clarifyingQuestions.length === 0) {
      clarifyingQuestions = missingUserInputs.slice(0, 2).map((field) => `What is your ${field}?`);
    }

    return normalizeExecutionPlan({
      objective,
      queryKind: normalizeQueryKind(json.queryKind),
      handler: {
        type: normalizeHandlerType(handlerRaw.type),
        capabilityId: handlerRaw.capabilityId
          ? String(handlerRaw.capabilityId).trim()
          : undefined,
        agentType: handlerRaw.agentType ? String(handlerRaw.agentType).trim() : undefined,
        openApp: handlerRaw.openApp ? String(handlerRaw.openApp).trim() : undefined,
      },
      contextFetches,
      parsedUserInputs: asRecord(json.parsedUserInputs),
      missingUserInputs,
      clarifyingQuestions,
      synthesisGuide: String(json.synthesisGuide ?? '').trim(),
      deliverables: asStringList(json.deliverables),
      acceptanceCriteria: asStringList(json.acceptanceCriteria),
      constraints: asStringList(json.constraints),
      localModelHint: normalizeHint(json.localModelHint),
    });
  } catch {
    return null;
  }
}

export function planToTaskBrief(plan: JarvisExecutionPlan) {
  return {
    objective: plan.objective,
    deliverables: plan.deliverables.length ? plan.deliverables : [plan.objective],
    approach: plan.synthesisGuide ? [plan.synthesisGuide] : [],
    localModelHint: plan.localModelHint,
    constraints: plan.constraints,
    acceptanceCriteria: plan.acceptanceCriteria,
  };
}
