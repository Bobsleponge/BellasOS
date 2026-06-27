import {
  APPLICATION_REGISTRY,
  getApplication,
  LEGACY_APP_ID_MAP,
  moduleAppUrl,
  userAppUrl,
} from '@bellasos/contracts';
import type { ApplicationDefinition } from '@bellasos/contracts';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Brain,
  Building2,
  Camera,
  Code2,
  Globe,
  Home,
  Mic,
  PieChart,
  Share2,
  Sparkles,
} from 'lucide-react';

const HIDDEN_DOCK_MODULES = new Set(['bellasos.llm', 'bellasos.finance']);

export type PrimaryApplicationId =
  | 'wealth'
  | 'research'
  | 'intelligence'
  | 'harvi-and-co'
  | 'truafrica'
  | 'automation'
  | 'coding-studio'
  | 'communications';

export interface PrimaryApplication {
  id: PrimaryApplicationId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** User-facing route when the app is opened from the launcher. */
  route: string;
  registryId?: string;
  moduleIds?: string[];
  ownership: 'native' | 'external' | 'hybrid';
  requiresConnect?: boolean;
}

export interface LauncherApplication {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  requiresConnect?: boolean;
  moduleIds?: string[];
}

const PRIMARY_ORDER: PrimaryApplicationId[] = [
  'wealth',
  'research',
  'intelligence',
  'harvi-and-co',
  'truafrica',
  'automation',
  'coding-studio',
  'communications',
];

const PRIMARY_META: Record<
  PrimaryApplicationId,
  Omit<PrimaryApplication, 'description' | 'registryId' | 'moduleIds' | 'ownership' | 'route'>
> = {
  wealth: {
    id: 'wealth',
    label: 'Wealth',
    icon: PieChart,
  },
  research: {
    id: 'research',
    label: 'Research',
    icon: BookOpen,
  },
  intelligence: {
    id: 'intelligence',
    label: 'Intelligence',
    icon: Brain,
  },
  'harvi-and-co': {
    id: 'harvi-and-co',
    label: 'Harvi & Co',
    icon: Building2,
    requiresConnect: true,
  },
  truafrica: {
    id: 'truafrica',
    label: 'TruAfrica',
    icon: Globe,
    requiresConnect: true,
  },
  automation: {
    id: 'automation',
    label: 'Automation',
    icon: Home,
  },
  'coding-studio': {
    id: 'coding-studio',
    label: 'Coding Studio',
    icon: Code2,
  },
  communications: {
    id: 'communications',
    label: 'Communications',
    icon: Share2,
  },
};

export const MODULE_ICONS: Record<string, LucideIcon> = {
  'bellasos.portfolio': PieChart,
  'bellasos.research': BookOpen,
  'bellasos.intelligence': Brain,
  'bellasos.social': Share2,
  'bellasos.automation': Home,
  'bellasos.voice': Mic,
  'bellasos.camera': Camera,
  'bellasos.coding': Code2,
};

const EXTRA_LAUNCHER_APPS: LauncherApplication[] = [
  {
    id: 'ai.studio',
    label: 'AI Studio',
    icon: Sparkles,
    route: '/ai',
  },
];

const DOCK_MODULE_IDS = ['bellasos.voice', 'bellasos.camera'] as const;

function registryEntryFor(id: PrimaryApplicationId): ApplicationDefinition | undefined {
  if (id === 'wealth') {
    return getApplication('wealth') ?? getApplication('finance-tracker');
  }
  return getApplication(id);
}

function routeForApp(id: string, extra?: Record<string, string>): string {
  return userAppUrl(id, extra);
}

export function getPrimaryApplications(): PrimaryApplication[] {
  return PRIMARY_ORDER.map((id) => {
    const meta = PRIMARY_META[id];
    const registry = registryEntryFor(id);
    return {
      ...meta,
      route: routeForApp(id),
      description: registry?.description ?? meta.label,
      registryId: registry?.id,
      moduleIds: registry?.moduleIds,
      ownership:
        id === 'wealth'
          ? 'hybrid'
          : (registry?.ownership ?? (meta.requiresConnect ? 'external' : 'native')),
    };
  });
}

/** Full user-facing app dock: primary apps + AI + Voice + Camera. */
export function getLauncherApplications(): LauncherApplication[] {
  const primary = getPrimaryApplications().map((app) => ({
    id: app.id,
    label: app.label,
    icon: app.icon,
    route: app.route,
    requiresConnect: app.requiresConnect,
    moduleIds: app.moduleIds,
  }));

  const extras = DOCK_MODULE_IDS.map((moduleId) => ({
    id: moduleId,
    label: moduleId === 'bellasos.voice' ? 'Voice' : 'Camera',
    icon: MODULE_ICONS[moduleId] ?? Sparkles,
    route: moduleAppUrl(moduleId),
    moduleIds: [moduleId],
  }));

  return [...primary, ...EXTRA_LAUNCHER_APPS, ...extras];
}

export function applicationLabel(id: string): string {
  const legacy = LEGACY_APP_ID_MAP[id] ?? id;
  const primary = PRIMARY_META[legacy as PrimaryApplicationId];
  if (primary) return primary.label;
  if (id === 'ai.studio' || id === 'bellasos.llm') return 'AI Studio';
  if (id === 'bellasos.voice') return 'Voice';
  if (id === 'bellasos.camera') return 'Camera';
  const registry = getApplication(id);
  if (registry) return registry.name;
  return id;
}

export function applicationRoute(id: string, extra?: Record<string, string>): string {
  const legacy = LEGACY_APP_ID_MAP[id] ?? id;
  const resolved = userAppUrl(legacy, extra);
  if (resolved !== '/') return resolved;
  if (id.startsWith('bellasos.')) return moduleAppUrl(id);
  return '/';
}

export function legacyModuleToApplication(moduleId: string): PrimaryApplicationId | undefined {
  const mapped = LEGACY_APP_ID_MAP[moduleId];
  if (mapped && mapped in PRIMARY_META) {
    return mapped as PrimaryApplicationId;
  }
  return undefined;
}

export function resolveNavigationId(appId: string): string {
  return LEGACY_APP_ID_MAP[appId] ?? appId;
}

/** Module IDs that should not appear as separate dock icons. */
export function isHiddenFromDock(moduleId: string): boolean {
  return HIDDEN_DOCK_MODULES.has(moduleId);
}

/** All registry applications (for Developer Mode reference). */
export function listRegistryApplications(): ApplicationDefinition[] {
  return APPLICATION_REGISTRY;
}

export const DEVELOPER_MODE_ROUTE = '/console?view=overview';
export const MISSION_CONTROL_ROUTE = '/';
