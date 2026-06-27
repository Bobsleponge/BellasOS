"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCodingTask = executeCodingTask;
exports.refineCodingProject = refineCodingProject;
const html_1 = require("./html");
const GAME_SYSTEM_PROMPT = 'You build browser games. Return ONE complete self-contained HTML document with embedded CSS and JavaScript. ' +
    'Use canvas for games. Keyboard controls MUST work inside a sandboxed iframe: attach keydown/keyup listeners on document or window, ' +
    'call preventDefault() on Arrow keys and WASD, and show a "Click to play" overlay that focuses the game on click. ' +
    'No markdown fences. No external URLs or CDN scripts. Must run offline in a sandbox iframe.';
const APP_SYSTEM_PROMPT = 'You build small web apps. Return ONE complete self-contained HTML document with embedded CSS and JavaScript. ' +
    'No markdown fences. No external URLs. Must run offline in a sandbox iframe.';
const REFINE_SYSTEM_PROMPT = 'You edit existing browser HTML apps and games. You receive the current HTML and a change request. ' +
    'Return ONE complete updated self-contained HTML document. Preserve working behavior; change only what the request needs. ' +
    'For games: keyboard controls MUST work in a sandboxed iframe — use document.addEventListener for keydown/keyup, ' +
    'preventDefault on Arrow keys and WASD, and include click-to-focus if needed. ' +
    'No markdown fences. No external URLs.';
function parsePlanJson(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match)
        return null;
    try {
        return JSON.parse(match[0]);
    }
    catch {
        return null;
    }
}
function defaultPlan(goal) {
    const lower = goal.toLowerCase();
    const isGame = /\b(game|snake|pong|tetris|play|arcade)\b/.test(lower);
    return {
        title: goal.slice(0, 60) || 'Coding project',
        artifact: isGame ? 'html-game' : 'html-app',
        steps: isGame
            ? ['Understand the game requirements', 'Generate self-contained HTML game', 'Validate and save for preview']
            : ['Understand the request', 'Generate self-contained HTML', 'Validate and save for preview'],
    };
}
function isGameHtml(html, goal) {
    return /\b(game|snake|pong|tetris|canvas|arcade)\b/i.test(goal + html);
}
async function generateHtml(ai, systemPrompt, userContent) {
    const genRes = await ai.complete({
        taskType: 'coding',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
        ],
        temperature: 0.35,
        maxTokens: 4096,
    });
    return (0, html_1.extractHtml)(genRes.text);
}
function finalizeProject(steps, project, save) {
    return (async () => {
        const playable = (0, html_1.isPlayableHtml)(project.html);
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
async function executeCodingTask(goal, ai, save) {
    const steps = [];
    const now = new Date().toISOString();
    const planRes = await ai.complete({
        taskType: 'coding',
        messages: [
            {
                role: 'system',
                content: 'You plan coding tasks. Return ONLY JSON: {"title":"short name","artifact":"html-game"|"html-app","steps":["step 1","step 2",...]}',
            },
            { role: 'user', content: goal },
        ],
        temperature: 0.2,
        maxTokens: 256,
    });
    const plan = parsePlanJson(planRes.text) ?? defaultPlan(goal);
    steps.push({
        id: 'analyze',
        label: 'Understand goal',
        status: 'done',
        detail: plan.title ?? goal.slice(0, 80),
    });
    for (const label of plan.steps ?? []) {
        steps.push({ id: `plan-${steps.length}`, label, status: 'done' });
    }
    const artifact = plan.artifact ?? 'html-app';
    const html = await generateHtml(ai, artifact === 'html-game' ? GAME_SYSTEM_PROMPT : APP_SYSTEM_PROMPT, goal);
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
    const project = {
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
async function refineCodingProject(prompt, existing, ai, save) {
    const steps = [];
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
    const project = {
        ...existing,
        goal: existing.goal.includes(prompt)
            ? existing.goal
            : `${existing.goal}\n\nRefinement: ${prompt}`,
        html,
        updatedAt: now,
    };
    return finalizeProject(steps, project, save);
}
//# sourceMappingURL=task-pipeline.js.map