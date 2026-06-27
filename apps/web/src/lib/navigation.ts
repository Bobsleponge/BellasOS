import {
  applicationLabel,
  applicationRoute,
} from '@/lib/applications';
import {
  moduleAppUrl,
  userAppUrl,
} from '@bellasos/contracts';
import { APP_STANDALONE_ROUTES } from '@/lib/financeApp';

/** Maps shell app IDs to Command Center `?view=` values. */
export const APP_TO_CONSOLE_VIEW: Record<string, string> = {
  'ai.studio': 'ai',
  'system.console': 'overview',
  wealth: 'module:bellasos.portfolio',
  'bellasos.portfolio': 'module:bellasos.portfolio',
  'bellasos.research': 'module:bellasos.research',
  'bellasos.intelligence': 'module:bellasos.intelligence',
  'bellasos.social': 'module:bellasos.social',
  'bellasos.automation': 'module:bellasos.automation',
  'bellasos.voice': 'module:bellasos.voice',
  'bellasos.camera': 'module:bellasos.camera',
  'bellasos.coding': 'module:bellasos.coding',
  'bellasos.finance': 'module:bellasos.finance',
  'bellasos.llm': 'ai',
};

export const APP_TITLES: Record<string, string> = {
  wealth: 'Wealth',
  'bellasos.portfolio': 'Wealth',
  'bellasos.research': 'Research',
  'bellasos.intelligence': 'Intelligence',
  'bellasos.social': 'Communications',
  communications: 'Communications',
  'bellasos.automation': 'Automation',
  'bellasos.voice': 'Voice',
  'bellasos.camera': 'Camera',
  'bellasos.coding': 'Coding Studio',
  'coding-studio': 'Coding Studio',
  'bellasos.finance': 'Wealth',
  'bellasos.finance-tracker': 'Wealth',
  'finance-tracker': 'Wealth',
  'bellasos.llm': 'AI & LLMs',
  'ai.studio': 'AI Studio',
  'system.console': 'Developer Mode',
  research: 'Research',
  intelligence: 'Intelligence',
  automation: 'Automation',
  'harvi-and-co': 'Harvi & Co',
  truafrica: 'TruAfrica',
};

/** Module IDs hidden from desktop (covered by system nav). */
export const HIDDEN_DESKTOP_MODULES = new Set(['bellasos.llm', 'bellasos.finance']);

/**
 * Module IDs hidden from Command Centre sidebar — still registered for Jarvis/agents.
 * Finance + Finance Tracker Live are managed under Wealth (connect, holdings, sync).
 */
export const HIDDEN_CONSOLE_MODULES = new Set([
  'bellasos.finance',
  'bellasos.finance-tracker',
]);

export function appIdToConsoleView(appId: string): string {
  if (APP_TO_CONSOLE_VIEW[appId]) return APP_TO_CONSOLE_VIEW[appId];
  if (appId.startsWith('bellasos.')) return `module:${appId}`;
  return 'overview';
}

export function consoleViewUrl(view: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ view });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return `/console?${params.toString()}`;
}

export function consoleAppUrl(appId: string, extra?: Record<string, string>): string {
  return consoleViewUrl(appIdToConsoleView(appId), extra);
}

export { moduleAppUrl };

export function shellAppUrl(appId: string, extra?: Record<string, string>): string {
  const fromUser = userAppUrl(appId, extra);
  if (fromUser !== '/') return fromUser;

  const fromRegistry = applicationRoute(appId, extra);
  if (fromRegistry !== '/') return fromRegistry;

  const standalone = APP_STANDALONE_ROUTES[appId];
  if (standalone) {
    if (extra?.section) return `/finance/${extra.section}`;
    return standalone;
  }

  if (appId.startsWith('bellasos.')) {
    return moduleAppUrl(appId);
  }

  return consoleAppUrl(appId, extra);
}

export function shellAppTitle(appId: string): string {
  return APP_TITLES[appId] ?? applicationLabel(appId);
}

export { MISSION_CONTROL_ROUTE, missionTabUrl } from '@/lib/missionRoutes';
