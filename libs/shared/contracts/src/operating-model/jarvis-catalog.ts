/**
 * Jarvis application catalog — single source of truth for intent routing prompts.
 *
 * Adding a new app:
 * 1. Create a bridge module in libs/modules/<app> with actions
 * 2. Register in application-registry.json (capabilities, intentExamples, jarvisGuide)
 * 3. Add connect endpoint in apps/api if external
 * 4. Optional specialist agent in libs/agents/pool
 * 5. Jarvis picks it up automatically via buildJarvisApplicationCatalog()
 */

import type { ApplicationDefinition } from './applications';
import { APPLICATION_REGISTRY, getApplication, LEGACY_APP_ID_MAP } from './application-registry';
import { STANDALONE_APP_ROUTES } from './app-routes';

/** Sub-entries folded into the user-facing Wealth application in Jarvis prompts. */
const SUBSUMED_BY_WEALTH = new Set(['finance-tracker', 'portfolio']);

const SUPPLEMENTAL_MODULE_HINTS: Record<string, string> = {
  'bellasos.workspace':
    'workspace.create, workspace.fromMessage, workspace.activate, workspace.gather, workspace.context.load, session.start',
};

export function resolveRegistryApplicationId(applicationId?: string): string | undefined {
  if (!applicationId?.trim()) return undefined;
  const key = applicationId.trim();
  if (getApplication(key)) {
    if (key === 'finance-tracker' && getApplication('wealth')) return 'wealth';
    return key;
  }
  let mapped = LEGACY_APP_ID_MAP[key];
  if (mapped === 'finance-tracker' && getApplication('wealth')) mapped = 'wealth';
  if (mapped && getApplication(mapped)) return mapped;
  return undefined;
}

function formatCapabilityLine(
  cap: ApplicationDefinition['capabilities'][number],
): string {
  const impl = cap.implementation
    ? ` → ${cap.implementation.moduleId}.${cap.implementation.action}`
    : '';
  const examples =
    cap.intentExamples?.length ? ` (e.g. "${cap.intentExamples.join('", "')}")` : '';
  return `    - ${cap.id}: ${cap.description}${impl}${examples}`;
}

function formatApplicationBlock(app: ApplicationDefinition): string {
  const lines: string[] = [];
  const aliasPart = app.aliases?.length ? ` [aliases: ${app.aliases.join(', ')}]` : '';
  const modules = app.moduleIds?.length ? ` modules: ${app.moduleIds.join(', ')}` : '';
  lines.push(`- ${app.id} (${app.name})${aliasPart}: ${app.description}${modules}`);
  if (app.jarvisGuide) {
    lines.push(`  Guide: ${app.jarvisGuide}`);
  }
  if (app.capabilities.length > 0) {
    lines.push('  Capabilities:');
    for (const cap of app.capabilities) {
      lines.push(formatCapabilityLine(cap));
    }
  }
  return lines.join('\n');
}

export interface JarvisCatalogOptions {
  /** Limit catalog to apps whose moduleIds intersect this set. */
  moduleIds?: string[];
}

export function buildJarvisApplicationCatalog(opts?: JarvisCatalogOptions): string {
  const scopedModules = opts?.moduleIds?.length
    ? new Set(opts.moduleIds)
    : undefined;

  const apps = APPLICATION_REGISTRY.filter((app) => {
    if (SUBSUMED_BY_WEALTH.has(app.id) && getApplication('wealth')) return false;
    if (!scopedModules) return true;
    if (!app.moduleIds?.length) return false;
    return app.moduleIds.some((id) => scopedModules.has(id));
  });

  if (apps.length === 0) {
    return 'Applications:\n(none registered for current scope)';
  }

  const blocks = apps.map(formatApplicationBlock);
  return `Applications and capabilities:\n${blocks.join('\n')}`;
}

export function buildSupplementalModuleHints(moduleIds: string[]): string {
  const lines: string[] = [];
  for (const moduleId of moduleIds) {
    const hint = SUPPLEMENTAL_MODULE_HINTS[moduleId];
    if (hint) {
      lines.push(`- ${moduleId}: ${hint}`);
    }
  }
  if (lines.length === 0) return '';
  return `\nSupplemental modules (not in application registry):\n${lines.join('\n')}`;
}

export function resolveJarvisOpenAppIds(): string[] {
  const ids = new Set<string>();

  for (const app of APPLICATION_REGISTRY) {
    ids.add(app.id);
    for (const moduleId of app.moduleIds ?? []) {
      ids.add(moduleId);
    }
  }

  for (const [legacy, registryId] of Object.entries(LEGACY_APP_ID_MAP)) {
    ids.add(legacy);
    ids.add(registryId);
  }

  for (const routeKey of Object.keys(STANDALONE_APP_ROUTES)) {
    ids.add(routeKey);
  }

  ids.add('ai.studio');
  ids.add('system.console');
  ids.add('bellasos.llm');

  return [...ids].sort();
}

export function formatApplicationContextForPrompt(applicationId?: string): string {
  const resolved = resolveRegistryApplicationId(applicationId);
  if (!resolved) return '';

  const app = getApplication(resolved);
  if (!app) return '';

  const parts = [`Active application: ${app.name} (${app.id})`];
  if (app.jarvisGuide) {
    parts.push(`Application guide: ${app.jarvisGuide}`);
  }
  if (app.capabilities.length > 0) {
    const capSummary = app.capabilities
      .slice(0, 8)
      .map((c) => c.name)
      .join(', ');
    parts.push(`Available capabilities: ${capSummary}`);
  }
  return parts.join('. ') + '.';
}
