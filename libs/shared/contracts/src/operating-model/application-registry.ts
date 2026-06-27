import type { AdvisoryPlaybook, ApplicationDefinition } from './applications';
import registryData from './application-registry.json';
import playbookData from './advisory-playbooks.json';

export const APPLICATION_REGISTRY: ApplicationDefinition[] =
  registryData as ApplicationDefinition[];

export const ADVISORY_PLAYBOOKS: AdvisoryPlaybook[] =
  playbookData as AdvisoryPlaybook[];

export function getApplication(id: string): ApplicationDefinition | undefined {
  return APPLICATION_REGISTRY.find((a) => a.id === id);
}

export function getCapability(capabilityId: string) {
  for (const app of APPLICATION_REGISTRY) {
    const capability = app.capabilities.find((c) => c.id === capabilityId);
    if (capability) return { application: app, capability };
  }
  return undefined;
}

export function getAdvisoryPlaybook(id: string): AdvisoryPlaybook | undefined {
  return ADVISORY_PLAYBOOKS.find((p) => p.id === id);
}

export function listAdvisoryPlaybooks(): AdvisoryPlaybook[] {
  return [...ADVISORY_PLAYBOOKS];
}

/** Maps legacy module / shell IDs to application registry IDs. */
export const LEGACY_APP_ID_MAP: Record<string, string> = {
  'bellasos.portfolio': 'wealth',
  'bellasos.research': 'research',
  'bellasos.intelligence': 'intelligence',
  'bellasos.social': 'communications',
  'bellasos.automation': 'automation',
  'bellasos.coding': 'coding-studio',
  'bellasos.finance-tracker': 'wealth',
  'finance-tracker': 'wealth',
  'bellasos.finance': 'wealth',
  wealth: 'wealth',
};
