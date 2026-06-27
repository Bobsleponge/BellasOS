#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'libs/shared/contracts/src/operating-model');
mkdirSync(dir, { recursive: true });

function cap(id, name, desc, access, fresh, approval, impl, intents = []) {
  return {
    id,
    name,
    description: desc,
    access,
    freshness: fresh,
    approval,
    intentExamples: intents.length ? intents : undefined,
    implementation: impl,
  };
}

function ft(action, id, name, desc, access = 'read', approval = 'none', intents = []) {
  return cap(id, name, desc, access, 'live', approval, {
    moduleId: 'bellasos.finance-tracker',
    action,
  }, intents);
}

const registry = [
  {
    id: 'finance-tracker',
    name: 'Finance Tracker',
    ownership: 'external',
    description: 'Personal and household finance system of record.',
    primaryDomain: 'wealth',
    secondaryDomains: ['execution'],
    systemOfRecord: true,
    integration: {
      type: 'iframe',
      baseUrlEnv: 'FINANCE_TRACKER_URL',
      apiKeyEnv: 'FINANCE_TRACKER_API_KEY',
      standaloneRoute: '/finance',
    },
    moduleIds: ['bellasos.finance-tracker'],
    capabilities: [
      ft('connection.status', 'wealth.connection.status', 'Connection status', 'Verify connectivity'),
      ft('summary.get', 'wealth.summary.get', 'Net worth summary', 'Net worth and cashflow summary', 'read', 'none', ['What is my net worth?']),
      ft('transactions.recent', 'wealth.transactions.recent', 'Recent transactions', 'Recent income expenses transfers', 'read', 'none', ['Show recent transactions']),
      ft('income.list', 'wealth.income.list', 'List income', 'List income records'),
      ft('expenses.list', 'wealth.expenses.list', 'List expenses', 'List expense records'),
      ft('assets.list', 'wealth.assets.list', 'List assets', 'List assets'),
      ft('liabilities.list', 'wealth.liabilities.list', 'List liabilities', 'List liabilities'),
      ft('investments.list', 'wealth.investments.list', 'List investments', 'List investments'),
      ft('income.add', 'wealth.income.add', 'Record income', 'Record income', 'write', 'confirm', ['Log income']),
      ft('expenses.add', 'wealth.expenses.add', 'Record expense', 'Record expense', 'write', 'confirm', ['Log expense']),
      ft('investments.add', 'wealth.investments.add', 'Record investment', 'Record investment purchase', 'write', 'confirm'),
      ft('transfers.add', 'wealth.transfers.add', 'Record transfer', 'Record account transfer', 'write', 'confirm'),
      ft('investments.quote.get', 'wealth.investments.quote.get', 'Stock quote', 'Live stock quote'),
      ft('investments.syncToPortfolio', 'wealth.investments.syncToPortfolio', 'Sync to portfolio', 'Sync investments to portfolio analysis', 'automate', 'confirm'),
    ],
  },
  {
    id: 'harvi-and-co',
    name: 'Harvi and Co',
    ownership: 'external',
    description: 'Harvi and Co venture operations system of record.',
    primaryDomain: 'ventures',
    secondaryDomains: ['execution', 'communications'],
    organizationId: 'org:harvi-and-co',
    systemOfRecord: true,
    integration: { type: 'api', baseUrlEnv: 'HARVI_URL', apiKeyEnv: 'HARVI_API_KEY' },
    capabilities: [
      cap('venture.harvi.projects.list', 'List projects', 'List Harvi projects', 'read', 'live', 'none', undefined, ['Harvi projects']),
      cap('venture.harvi.summary.get', 'Venture summary', 'Harvi operational summary', 'read', 'cached', 'none', undefined, ['How is Harvi doing?']),
      cap('venture.harvi.tasks.create', 'Create task', 'Create task in Harvi', 'write', 'live', 'required'),
    ],
  },
  {
    id: 'truafrica',
    name: 'TruAfrica',
    ownership: 'external',
    description: 'TruAfrica venture operations system of record.',
    primaryDomain: 'ventures',
    secondaryDomains: ['execution', 'knowledge'],
    organizationId: 'org:truafrica',
    systemOfRecord: true,
    integration: { type: 'api', baseUrlEnv: 'TRUAFRICA_URL', apiKeyEnv: 'TRUAFRICA_API_KEY' },
    capabilities: [
      cap('venture.truafrica.projects.list', 'List projects', 'List TruAfrica projects', 'read', 'live', 'none', undefined, ['TruAfrica projects']),
      cap('venture.truafrica.summary.get', 'Venture summary', 'TruAfrica operational summary', 'read', 'cached', 'none'),
      cap('venture.truafrica.tasks.create', 'Create task', 'Create task in TruAfrica', 'write', 'live', 'required'),
    ],
  },
  {
    id: 'research',
    name: 'Research',
    ownership: 'native',
    description: 'Structured research on companies industries and topics.',
    primaryDomain: 'knowledge',
    secondaryDomains: ['intelligence'],
    systemOfRecord: false,
    integration: { type: 'native' },
    moduleIds: ['bellasos.research'],
    capabilities: [
      cap('knowledge.research.run', 'Run research', 'Deep research on a subject', 'analyze', 'live', 'none', { moduleId: 'bellasos.research', action: 'run' }, ['Research NVIDIA']),
      cap('knowledge.research.reports.list', 'List reports', 'List saved research reports', 'read', 'cached', 'none', { moduleId: 'bellasos.research', action: 'reports.list' }),
    ],
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    ownership: 'native',
    description: 'Sector briefings alerts and monitored world intelligence.',
    primaryDomain: 'intelligence',
    secondaryDomains: ['knowledge', 'ventures'],
    systemOfRecord: false,
    integration: { type: 'native' },
    moduleIds: ['bellasos.intelligence'],
    capabilities: [
      cap('intelligence.brief.generate', 'Generate briefing', 'Generate sector briefing', 'analyze', 'live', 'none', { moduleId: 'bellasos.intelligence', action: 'brief.generate' }, ['Brief me']),
      cap('intelligence.briefings.list', 'List briefings', 'List recent briefings', 'read', 'cached', 'none', { moduleId: 'bellasos.intelligence', action: 'briefings.list' }),
      cap('intelligence.alerts.create', 'Create alert', 'Create alert rule', 'write', 'live', 'confirm', { moduleId: 'bellasos.intelligence', action: 'alerts.create' }),
      cap('intelligence.alerts.list', 'List alerts', 'List alert rules', 'read', 'cached', 'none', { moduleId: 'bellasos.intelligence', action: 'alerts.list' }),
    ],
  },
  {
    id: 'coding-studio',
    name: 'Coding Studio',
    ownership: 'native',
    description: 'Build and refine runnable HTML apps and games.',
    primaryDomain: 'execution',
    secondaryDomains: ['ventures'],
    systemOfRecord: false,
    integration: { type: 'native' },
    moduleIds: ['bellasos.coding'],
    capabilities: [
      cap('execution.coding.task.execute', 'Build artifact', 'Build runnable HTML app or game', 'write', 'live', 'confirm', { moduleId: 'bellasos.coding', action: 'task.execute' }, ['Build a game']),
      cap('execution.coding.task.refine', 'Refine artifact', 'Fix or extend coding project', 'write', 'live', 'confirm', { moduleId: 'bellasos.coding', action: 'task.refine' }),
      cap('execution.coding.project.list', 'List projects', 'List coding projects', 'read', 'cached', 'none', { moduleId: 'bellasos.coding', action: 'project.list' }),
    ],
  },
  {
    id: 'automation',
    name: 'Automation',
    ownership: 'native',
    description: 'Smart home and environment control.',
    primaryDomain: 'environment',
    secondaryDomains: ['automation'],
    systemOfRecord: false,
    integration: { type: 'api' },
    moduleIds: ['bellasos.automation'],
    capabilities: [
      cap('environment.devices.list', 'List devices', 'List home devices', 'read', 'live', 'none', { moduleId: 'bellasos.automation', action: 'devices.list' }, ['List my lights']),
      cap('environment.device.control', 'Control device', 'Control home device', 'write', 'live', 'confirm', { moduleId: 'bellasos.automation', action: 'device.control' }, ['Turn off the lights']),
    ],
  },
  {
    id: 'communications',
    name: 'Communications',
    ownership: 'native',
    description: 'Draft schedule and publish social content.',
    primaryDomain: 'communications',
    secondaryDomains: ['ventures'],
    systemOfRecord: false,
    integration: { type: 'native' },
    moduleIds: ['bellasos.social'],
    capabilities: [
      cap('communications.draft.create', 'Create draft', 'AI social post draft', 'write', 'live', 'none', { moduleId: 'bellasos.social', action: 'draft.create' }, ['Draft a LinkedIn post']),
      cap('communications.schedule', 'Schedule draft', 'Schedule draft for publish', 'write', 'live', 'confirm', { moduleId: 'bellasos.social', action: 'schedule' }),
      cap('communications.publish', 'Publish draft', 'Publish to connected platform', 'publish', 'live', 'required', { moduleId: 'bellasos.social', action: 'publish' }, ['Publish the draft']),
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    ownership: 'hybrid',
    description: 'Holdings analysis and allocation synced with Finance Tracker.',
    primaryDomain: 'wealth',
    secondaryDomains: ['intelligence'],
    systemOfRecord: false,
    integration: { type: 'native', standaloneRoute: '/finance' },
    moduleIds: ['bellasos.portfolio'],
    capabilities: [
      cap('wealth.portfolio.summary', 'Portfolio summary', 'Allocation and holdings summary', 'read', 'cached', 'none', { moduleId: 'bellasos.portfolio', action: 'summary' }, ['Portfolio summary']),
      cap('wealth.portfolio.analyze', 'Analyze portfolio', 'AI portfolio analysis', 'analyze', 'live', 'none', { moduleId: 'bellasos.portfolio', action: 'analyze' }),
      cap('wealth.portfolio.holdings.add', 'Add holding', 'Add holding to portfolio view', 'write', 'live', 'confirm', { moduleId: 'bellasos.portfolio', action: 'holdings.add' }),
    ],
  },
];

writeFileSync(join(dir, 'application-registry.json'), JSON.stringify(registry, null, 2), 'utf8');

const ts = `import type { ApplicationDefinition } from './applications';
import registryData from './application-registry.json';

export const APPLICATION_REGISTRY: ApplicationDefinition[] =
  registryData as ApplicationDefinition[];

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

export const LEGACY_APP_ID_MAP: Record<string, string> = {
  'bellasos.portfolio': 'portfolio',
  'bellasos.research': 'research',
  'bellasos.intelligence': 'intelligence',
  'bellasos.social': 'communications',
  'bellasos.automation': 'automation',
  'bellasos.coding': 'coding-studio',
  'bellasos.finance-tracker': 'finance-tracker',
  'bellasos.finance': 'portfolio',
};
`;

writeFileSync(join(dir, 'application-registry.ts'), ts, 'utf8');
console.log('Generated application registry');
