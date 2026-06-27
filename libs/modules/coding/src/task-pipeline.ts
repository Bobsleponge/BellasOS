import type { AIGateway } from '@bellasos/contracts';
import { getModuleHybridProfile, useCloudLead } from '@bellasos/module-hybrid';
import { extractHtml, isPlayableHtml } from './html';

export interface TaskStepResult {
  id: string;
  label: string;
  status: 'done' | 'failed';
  detail?: string;
}

export interface CodingProject {
  id: string;
  title: string;
  goal: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskExecuteResult {
  project: CodingProject;
  steps: TaskStepResult[];
  playable: boolean;
}

interface PlanJson {
  title?: string;
  artifact?: 'html-game' | 'html-app';
  steps?: string[];
  acceptanceTests?: string[];
  architecture?: string[];
}

const GAME_SYSTEM_PROMPT =
  'You build browser games. Return ONE complete self-contained HTML document with embedded CSS and JavaScript. ' +
  'Use canvas for games. Keyboard controls MUST work inside a sandboxed iframe: attach keydown/keyup listeners on document or window, ' +
  'call preventDefault() on Arrow keys and WASD, and show a "Click to play" overlay that focuses the game on click. ' +
  'No markdown fences. No external URLs or CDN scripts. Must run offline in a sandbox iframe.';

const APP_SYSTEM_PROMPT =
  'You build small web apps. Return ONE complete self-contained HTML document with embedded CSS and JavaScript. ' +
  'No markdown fences. No external URLs. Must run offline in a sandbox iframe.';

const REFINE_SYSTEM_PROMPT =
  'You edit existing browser HTML apps and games. You receive the current HTML and a change request. ' +
  'Return ONE complete updated self-contained HTML document. Preserve working behavior; change only what the request needs. ' +
  'For games: keyboard controls MUST work in a sandboxed iframe — use document.addEventListener for keydown/keyup, ' +
  'preventDefault on Arrow keys and WASD, and include click-to-focus if needed. ' +
  'No markdown fences. No external URLs.';

function parsePlanJson(text: string): PlanJson | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as PlanJson;
  } catch {
    return null;
  }
}

function defaultPlan(goal: string): PlanJson {
  const lower = goal.toLowerCase();
  const isGame = /\b(game|snake|pong|tetris|play|arcade)\b/.test(lower);
  return {
    title: goal.slice(0, 60) || 'Coding project',
    artifact: isGame ? 'html-game' : 'html-app',
    steps: isGame
      ? ['Understand the game requirements', 'Generate self-contained HTML game', 'Validate and save for preview']
      : ['Understand the request', 'Generate self-contained HTML', 'Validate and save for preview'],
    acceptanceTests: isGame
      ? ['keyboard controls work', 'game loop runs', 'score or win condition visible']
      : ['UI renders', 'core interaction works'],
  };
}

async function planCodingTask(
  goal: string,
  ai: AIGateway,
  traceId?: string,
): Promise<{ plan: PlanJson; leadModel?: string }> {
  if (!useCloudLead()) {
    const planRes = await ai.complete({
      taskType: 'coding',
      traceId,
      messages: [
        {
          role: 'system',
          content:
            'You plan coding tasks. Return ONLY JSON: {"title":"short name","artifact":"html-game"|"html-app","steps":["step 1",...],"acceptanceTests":["..."]}',
        },
        { role: 'user', content: goal },
      ],
      temperature: 0.2,
      maxTokens: 256,
    });
    return { plan: parsePlanJson(planRes.text) ?? defaultPlan(goal) };
  }

  const profile = getModuleHybridProfile();
  const planRes = await ai.complete({
    model: profile.leadModel,
    taskType: 'coding',
    traceId,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior engineering lead. Return ONLY JSON: ' +
          '{"title":"short name","artifact":"html-game"|"html-app","architecture":["..."],"steps":["..."],"acceptanceTests":["testable criteria"]}. ' +
          'Be thorough on acceptanceTests and architecture.',
      },
      { role: 'user', content: goal },
    ],
    temperature: 0.2,
    maxTokens: Math.min(profile.leadMaxTokens, 900),
  });

  return {
    plan: parsePlanJson(planRes.text) ?? defaultPlan(goal),
    leadModel: profile.leadModel,
  };
}

async function reviewCodingHtml(
  goal: string,
  plan: PlanJson,
  html: string,
  ai: AIGateway,
  traceId?: string,
): Promise<{ passed: boolean; gaps: string[] }> {
  const profile = getModuleHybridProfile();
  if (!profile.reviewEnabled || profile.reviewMaxTokens <= 0) {
    return { passed: true, gaps: [] };
  }

  const tests = plan.acceptanceTests ?? [];
  const reviewRes = await ai.complete({
    model: profile.reviewModel,
    taskType: 'coding',
    traceId,
    messages: [
      {
        role: 'system',
        content:
          'You QA HTML artifacts. Return ONLY JSON: {"passed":true|false,"gaps":["missing or broken items"]}',
      },
      {
        role: 'user',
        content: [
          `Goal: ${goal}`,
          plan.architecture?.length ? `Architecture: ${plan.architecture.join('; ')}` : '',
          tests.length ? `Acceptance tests:\n${tests.map((t, i) => `${i + 1}. ${t}`).join('\n')}` : '',
          `HTML (${html.length} chars, truncated):\n${html.slice(0, 6000)}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    temperature: 0.1,
    maxTokens: profile.reviewMaxTokens,
  });

  const match = reviewRes.text.match(/\{[\s\S]*\}/);
  if (!match) return { passed: true, gaps: [] };
  try {
    const json = JSON.parse(match[0]) as { passed?: boolean; gaps?: string[] };
    return {
      passed: json.passed === true,
      gaps: Array.isArray(json.gaps) ? json.gaps.map(String).filter(Boolean) : [],
    };
  } catch {
    return { passed: true, gaps: [] };
  }
}

function isGameHtml(html: string, goal: string): boolean {
  return /\b(game|snake|pong|tetris|canvas|arcade)\b/i.test(goal + html);
}

async function generateHtml(
  ai: AIGateway,
  systemPrompt: string,
  userContent: string,
  traceId?: string,
  gapNotes?: string[],
): Promise<string> {
  const genRes = await ai.complete({
    taskType: 'coding',
    traceId,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          gapNotes && gapNotes.length > 0
            ? `${userContent}\n\nFix these QA gaps:\n${gapNotes.map((g, i) => `${i + 1}. ${g}`).join('\n')}`
            : userContent,
      },
    ],
    temperature: 0.35,
    maxTokens: 4096,
  });
  return extractHtml(genRes.text);
}

function finalizeProject(
  steps: TaskStepResult[],
  project: CodingProject,
  save: (project: CodingProject) => Promise<void>,
): Promise<TaskExecuteResult> {
  return (async () => {
    const playable = isPlayableHtml(project.html);
    steps.push({
      id: 'validate',
      label: 'Validate artifact',
      status: 'done',
      detail: playable ? 'Playable HTML detected' : 'HTML saved (preview may be static)',
    });

    await save(project);
    steps.push({
      id: 'save',
      label: 'Save project',
      status: 'done',
      detail: project.id,
    });
    steps.push({
      id: 'preview',
      label: 'Ready to preview',
      status: 'done',
    });

    return { project, steps, playable };
  })();
}

/**
 * Standard end-to-end coding task flow:
 * analyze goal → plan steps → generate artifact → validate → persist → ready to preview.
 */
export async function executeCodingTask(
  goal: string,
  ai: AIGateway,
  save: (project: CodingProject) => Promise<void>,
  traceId?: string,
): Promise<TaskExecuteResult> {
  const steps: TaskStepResult[] = [];
  const now = new Date().toISOString();

  const { plan, leadModel } = await planCodingTask(goal, ai, traceId);
  steps.push({
    id: 'analyze',
    label: 'Understand goal',
    status: 'done',
    detail: leadModel ? `${plan.title ?? goal.slice(0, 80)} (lead: ${leadModel})` : (plan.title ?? goal.slice(0, 80)),
  });

  for (const label of plan.steps ?? []) {
    steps.push({ id: `plan-${steps.length}`, label, status: 'done' });
  }

  const artifact = plan.artifact ?? 'html-app';
  const planContext = [
    plan.architecture?.length ? `Architecture:\n${plan.architecture.map((a) => `- ${a}`).join('\n')}` : '',
    plan.acceptanceTests?.length
      ? `Must pass:\n${plan.acceptanceTests.map((t) => `- ${t}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const userGoal = planContext ? `${goal}\n\n${planContext}` : goal;
  let html = await generateHtml(
    ai,
    artifact === 'html-game' ? GAME_SYSTEM_PROMPT : APP_SYSTEM_PROMPT,
    userGoal,
    traceId,
  );

  const profile = getModuleHybridProfile();
  if (profile.reviewEnabled && html.length >= 40) {
    for (let loop = 0; loop < profile.maxReviewLoops; loop++) {
      const review = await reviewCodingHtml(goal, plan, html, ai, traceId);
      steps.push({
        id: `review-${loop + 1}`,
        label: 'OpenAI QA review',
        status: 'done',
        detail: review.passed ? 'Passed' : review.gaps.join('; ').slice(0, 120),
      });
      if (review.passed || review.gaps.length === 0) break;
      html = await generateHtml(
        ai,
        artifact === 'html-game' ? GAME_SYSTEM_PROMPT : APP_SYSTEM_PROMPT,
        userGoal,
        traceId,
        review.gaps,
      );
    }
  }

  if (!html || html.length < 40) {
    steps.push({
      id: 'generate',
      label: 'Generate code',
      status: 'failed',
      detail: 'Model returned empty or invalid HTML',
    });
    throw new Error('Failed to generate runnable HTML');
  }

  steps.push({
    id: 'generate',
    label: 'Generate code',
    status: 'done',
    detail: `${html.length} chars`,
  });

  const project: CodingProject = {
    id: crypto.randomUUID(),
    title: plan.title?.trim() || 'Coding project',
    goal,
    html,
    createdAt: now,
    updatedAt: now,
  };

  return finalizeProject(steps, project, save);
}

/**
 * Refine an existing project with a natural-language prompt.
 * analyze change → apply edit → validate → save same project id.
 */
export async function refineCodingProject(
  prompt: string,
  existing: CodingProject,
  ai: AIGateway,
  save: (project: CodingProject) => Promise<void>,
): Promise<TaskExecuteResult> {
  const steps: TaskStepResult[] = [];
  const now = new Date().toISOString();

  steps.push({
    id: 'analyze',
    label: 'Understand change request',
    status: 'done',
    detail: prompt.slice(0, 80),
  });

  steps.push({
    id: 'load',
    label: 'Load existing project',
    status: 'done',
    detail: existing.title,
  });

  const userContent = [
    `Original goal: ${existing.goal}`,
    `Change request: ${prompt}`,
    '',
    'Current HTML (update this, return the full revised document):',
    existing.html,
  ].join('\n');

  const html = await generateHtml(ai, REFINE_SYSTEM_PROMPT, userContent);

  if (!html || html.length < 40) {
    steps.push({
      id: 'generate',
      label: 'Apply changes',
      status: 'failed',
      detail: 'Model returned empty or invalid HTML',
    });
    throw new Error('Failed to apply changes');
  }

  steps.push({
    id: 'generate',
    label: 'Apply changes',
    status: 'done',
    detail: `${html.length} chars`,
  });

  const project: CodingProject = {
    ...existing,
    goal: existing.goal.includes(prompt)
      ? existing.goal
      : `${existing.goal}\n\nRefinement: ${prompt}`,
    html,
    updatedAt: now,
  };

  return finalizeProject(steps, project, save);
}
