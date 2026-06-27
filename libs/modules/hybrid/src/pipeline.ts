import type { AIGateway, AITaskType } from '@bellasos/contracts';
import { getHybridProfileName, getModuleHybridProfile, useCloudLead } from './profile';

export interface ContentPlan {
  objective: string;
  deliverables: string[];
  sections: string[];
  approach: string[];
  acceptanceCriteria: string[];
  constraints: string[];
}

export interface HybridPipelineMeta {
  profile: string;
  hybrid: boolean;
  leadModel?: string;
  executeModel?: string;
  reviewModel?: string;
  synthesisModel?: string;
  reviewLoops: number;
  reviewPassed?: boolean;
  synthesized: boolean;
  plan?: ContentPlan;
}

export interface HybridPipelineResult {
  content: string;
  meta: HybridPipelineMeta;
}

export function extractJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

export function parseContentPlan(text: string): ContentPlan | null {
  const json = extractJsonObject<Record<string, unknown>>(text);
  if (!json) return null;
  const objective = String(json.objective ?? '').trim();
  if (!objective) return null;
  const sections = asStringList(json.sections);
  const deliverables = asStringList(json.deliverables);
  return {
    objective,
    deliverables,
    sections: sections.length > 0 ? sections : deliverables,
    approach: asStringList(json.approach),
    acceptanceCriteria: asStringList(json.acceptanceCriteria),
    constraints: asStringList(json.constraints),
  };
}

function formatPlanForExecutor(plan: ContentPlan): string {
  const lines = [`Objective: ${plan.objective}`];
  if (plan.deliverables.length) {
    lines.push('Deliverables:', ...plan.deliverables.map((d) => `- ${d}`));
  }
  if (plan.approach.length) {
    lines.push('Approach:', ...plan.approach.map((s, i) => `${i + 1}. ${s}`));
  }
  if (plan.constraints.length) {
    lines.push('Constraints:', ...plan.constraints.map((c) => `- ${c}`));
  }
  if (plan.acceptanceCriteria.length) {
    lines.push('Must satisfy:', ...plan.acceptanceCriteria.map((c) => `- ${c}`));
  }
  return lines.join('\n');
}

function buildLeadUserPrompt(input: {
  request: string;
  contextBlock?: string;
  leadHints?: string;
}): string {
  const parts = [
    'Return ONLY valid JSON (no markdown fences):',
    '{',
    '  "objective": "one sentence",',
    '  "deliverables": ["..."],',
    '  "sections": ["ordered section headings for the final document"],',
    '  "approach": ["ordered steps"],',
    '  "acceptanceCriteria": ["testable checks"],',
    '  "constraints": ["tone, length, format"]',
    '}',
    '',
    `Request:\n${input.request.trim()}`,
  ];
  if (input.contextBlock?.trim()) parts.push('', `Context:\n${input.contextBlock.trim()}`);
  if (input.leadHints?.trim()) parts.push('', input.leadHints.trim());
  return parts.join('\n');
}

function buildReviewPrompt(plan: ContentPlan, draft: string): string {
  const criteria =
    plan.acceptanceCriteria.length > 0
      ? plan.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : plan.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n');
  return [
    'Review the draft. Return ONLY JSON: {"passed":true|false,"gaps":["..."]}',
    `Objective: ${plan.objective}`,
    'Criteria:',
    criteria,
    '',
    'Draft:',
    draft,
  ].join('\n');
}

export async function runHybridContentPipeline(
  ai: AIGateway,
  input: {
    traceId: string;
    request: string;
    contextBlock: string;
    executeSystem: string;
    leadSystem: string;
    leadHints?: string;
    taskType?: AITaskType;
    pinExecuteModel?: string;
    mathFactsBlock?: string;
  },
): Promise<HybridPipelineResult> {
  const profile = getModuleHybridProfile();
  const taskType = input.taskType ?? 'reasoning';
  const meta: HybridPipelineMeta = {
    profile: getHybridProfileName(),
    hybrid: useCloudLead(),
    reviewLoops: 0,
    synthesized: false,
  };

  let plan: ContentPlan | null = null;
  if (useCloudLead()) {
    const lead = await ai.complete({
      model: profile.leadModel,
      taskType: 'classification',
      traceId: input.traceId,
      maxTokens: profile.leadMaxTokens,
      temperature: 0.2,
      messages: [
        { role: 'system', content: input.leadSystem },
        {
          role: 'user',
          content: buildLeadUserPrompt({
            request: input.request,
            contextBlock: input.contextBlock,
            leadHints: input.leadHints,
          }),
        },
      ],
    });
    plan = parseContentPlan(lead.text);
    meta.leadModel = profile.leadModel;
  }

  if (!plan) {
    plan = {
      objective: input.request.slice(0, 200),
      deliverables: ['Complete response'],
      sections: ['Response'],
      approach: ['Answer using provided context'],
      acceptanceCriteria: [],
      constraints: [],
    };
  }
  meta.plan = plan;

  const planBlock = formatPlanForExecutor(plan);
  const mathBlock = input.mathFactsBlock
    ? `\n\nVERIFIED NUMBERS (do not recalculate or contradict):\n${input.mathFactsBlock}`
    : '';
  const baseUser = `${input.request}\n\n${input.contextBlock}${mathBlock}\n\n${planBlock}`;

  let draft = '';
  let executeModel: string | undefined;

  if (profile.sectionedExecute && plan.sections.length > 1) {
    const parts: string[] = [];
    for (const section of plan.sections) {
      const sectionRes = await ai.complete({
        model: input.pinExecuteModel,
        taskType,
        traceId: input.traceId,
        maxTokens: 2048,
        temperature: 0.45,
        messages: [
          { role: 'system', content: input.executeSystem },
          {
            role: 'user',
            content: `${baseUser}\n\nWrite ONLY the "${section}" section now. Use a clear heading.`,
          },
        ],
      });
      executeModel = sectionRes.model;
      parts.push(sectionRes.text.trim());
    }
    draft = parts.join('\n\n');
  } else {
    const execute = await ai.complete({
      model: input.pinExecuteModel,
      taskType,
      traceId: input.traceId,
      maxTokens: 3072,
      temperature: 0.45,
      messages: [
        { role: 'system', content: input.executeSystem },
        { role: 'user', content: baseUser },
      ],
    });
    draft = execute.text.trim();
    executeModel = execute.model;
  }
  meta.executeModel = executeModel;

  if (profile.reviewEnabled && profile.maxReviewLoops > 0) {
    for (let i = 0; i < profile.maxReviewLoops; i++) {
      const review = await ai.complete({
        model: profile.reviewModel,
        taskType: 'classification',
        traceId: input.traceId,
        maxTokens: profile.reviewMaxTokens,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'You are a strict QA lead. Output only JSON.' },
          { role: 'user', content: buildReviewPrompt(plan, draft) },
        ],
      });
      meta.reviewModel = profile.reviewModel;
      const parsed = extractJsonObject<{ passed?: boolean; gaps?: string[] }>(review.text);
      const passed = parsed?.passed === true;
      const gaps = Array.isArray(parsed?.gaps) ? parsed!.gaps!.map(String).filter(Boolean) : [];
      meta.reviewLoops = i + 1;
      meta.reviewPassed = passed;
      if (passed || gaps.length === 0) break;

      const refine = await ai.complete({
        model: input.pinExecuteModel,
        taskType,
        traceId: input.traceId,
        maxTokens: Math.max(2048, profile.refineMaxTokens),
        temperature: 0.4,
        messages: [
          { role: 'system', content: input.executeSystem },
          {
            role: 'user',
            content: `${baseUser}\n\nFix these gaps in your revised response:\n${gaps.map((g, n) => `${n + 1}. ${g}`).join('\n')}\n\nCurrent draft:\n${draft}`,
          },
        ],
      });
      draft = refine.text.trim();
      executeModel = refine.model;
      meta.executeModel = executeModel;
    }
  }

  if (profile.synthesisMaxTokens > 0 && useCloudLead()) {
    const synth = await ai.complete({
      model: profile.synthesisModel,
      taskType: 'general',
      traceId: input.traceId,
      maxTokens: profile.synthesisMaxTokens,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            'Polish for clarity and structure. Keep all facts, numbers, and citations. Do not mention internal routing.',
        },
        {
          role: 'user',
          content: `Objective: ${plan.objective}\n\nPolish:\n${draft}`,
        },
      ],
    });
    const polished = synth.text.trim();
    if (polished) {
      draft = polished;
      meta.synthesized = true;
      meta.synthesisModel = profile.synthesisModel;
    }
  }

  return { content: draft, meta };
}
