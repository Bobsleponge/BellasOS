/** User-facing app paths (not dev-gated Command Center). */

export const MODULE_APP_SLUGS: Record<string, string> = {
  'bellasos.research': 'research',
  'bellasos.intelligence': 'intelligence',
  'bellasos.coding': 'coding',
  'bellasos.automation': 'automation',
  'bellasos.social': 'communications',
  'bellasos.voice': 'voice',
  'bellasos.camera': 'camera',
};

export const STANDALONE_APP_ROUTES: Record<string, string> = {
  wealth: '/finance',
  'finance-tracker': '/finance',
  'bellasos.portfolio': '/finance',
  'bellasos.finance': '/finance',
  'bellasos.finance-tracker': '/finance',
  'ai.studio': '/ai',
  'bellasos.llm': '/ai',
  research: '/apps/research',
  intelligence: '/apps/intelligence',
  automation: '/apps/automation',
  'coding-studio': '/apps/coding',
  communications: '/apps/communications',
  'harvi-and-co': '/apps/harvi-and-co',
  truafrica: '/apps/truafrica',
};

const PRIMARY_TO_MODULE: Record<string, string> = {
  research: 'bellasos.research',
  intelligence: 'bellasos.intelligence',
  automation: 'bellasos.automation',
  'coding-studio': 'bellasos.coding',
  communications: 'bellasos.social',
};

export function moduleAppSlug(moduleId: string): string {
  return MODULE_APP_SLUGS[moduleId] ?? moduleId.replace(/^bellasos\./, '');
}

export function moduleAppUrl(moduleId: string): string {
  const standalone = STANDALONE_APP_ROUTES[moduleId];
  if (standalone) return standalone;
  return `/apps/${moduleAppSlug(moduleId)}`;
}

export function userAppUrl(appId: string, extra?: Record<string, string>): string {
  if (appId === 'wealth' && extra?.section) {
    return `/finance/${extra.section}`;
  }

  const direct = STANDALONE_APP_ROUTES[appId];
  if (direct) return direct;

  if (appId.startsWith('bellasos.')) {
    return moduleAppUrl(appId);
  }

  const moduleId = PRIMARY_TO_MODULE[appId];
  if (moduleId) return moduleAppUrl(moduleId);

  return '/';
}

export function slugToModuleId(slug: string): string | null {
  for (const [moduleId, mapped] of Object.entries(MODULE_APP_SLUGS)) {
    if (mapped === slug) return moduleId;
  }
  return null;
}

export function isVentureAppSlug(slug: string): slug is 'harvi-and-co' | 'truafrica' {
  return slug === 'harvi-and-co' || slug === 'truafrica';
}

/** Intelligence app route for signals and today items. */
export const INTELLIGENCE_APP_URL = '/apps/intelligence';

/** Wealth app route for signals and today items. */
export const WEALTH_APP_URL = '/finance';
