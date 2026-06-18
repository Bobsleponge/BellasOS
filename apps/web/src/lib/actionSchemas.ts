export type ActionFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'datetime';

export interface ActionFieldSpec {
  key: string;
  label: string;
  type: ActionFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
}

/** Typed form specs for module actions (mirrors backend Zod inputSchema). */
export const ACTION_FIELD_SPECS: Record<string, ActionFieldSpec[]> = {
  'bellasos.portfolio:holdings.add': [
    { key: 'account', label: 'Account', type: 'string', required: true },
    { key: 'symbol', label: 'Symbol', type: 'string', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'costBasis', label: 'Cost basis', type: 'number', required: true },
    { key: 'price', label: 'Price override', type: 'number' },
  ],
  'bellasos.portfolio:holdings.delete': [
    { key: 'id', label: 'Holding ID', type: 'string', required: true },
  ],
  'bellasos.portfolio:watchlist.add': [
    { key: 'symbol', label: 'Symbol', type: 'string', required: true },
  ],
  'bellasos.portfolio:watchlist.remove': [
    { key: 'symbol', label: 'Symbol', type: 'string', required: true },
  ],
  'bellasos.research:run': [
    { key: 'subject', label: 'Subject', type: 'string', required: true },
    {
      key: 'kind',
      label: 'Kind',
      type: 'enum',
      options: ['company', 'industry', 'topic'],
      defaultValue: 'company',
    },
  ],
  'bellasos.research:reports.delete': [
    { key: 'id', label: 'Report ID', type: 'string', required: true },
  ],
  'bellasos.intelligence:brief.generate': [
    {
      key: 'cadence',
      label: 'Cadence',
      type: 'enum',
      options: ['daily', 'weekly'],
      defaultValue: 'daily',
    },
  ],
  'bellasos.intelligence:sectors.add': [
    { key: 'name', label: 'Sector name', type: 'string', required: true },
  ],
  'bellasos.intelligence:sectors.remove': [
    { key: 'name', label: 'Sector name', type: 'string', required: true },
  ],
  'bellasos.intelligence:alerts.create': [
    { key: 'sector', label: 'Sector', type: 'string', required: true },
    { key: 'keyword', label: 'Keyword', type: 'string', required: true },
  ],
  'bellasos.social:draft.create': [
    {
      key: 'platform',
      label: 'Platform',
      type: 'enum',
      options: ['LinkedIn', 'X', 'Instagram', 'Facebook', 'YouTube', 'TikTok'],
      defaultValue: 'LinkedIn',
    },
    { key: 'topic', label: 'Topic', type: 'string', required: true },
    { key: 'tone', label: 'Tone', type: 'string', defaultValue: 'professional' },
  ],
  'bellasos.social:schedule': [
    { key: 'draftId', label: 'Draft ID', type: 'string', required: true },
    { key: 'when', label: 'Schedule (ISO datetime)', type: 'datetime', required: true },
  ],
  'bellasos.social:publish': [
    { key: 'draftId', label: 'Draft ID', type: 'string', required: true },
  ],
  'bellasos.social:analytics': [
    {
      key: 'platform',
      label: 'Platform (optional)',
      type: 'enum',
      options: ['LinkedIn', 'X', 'Instagram', 'Facebook', 'YouTube', 'TikTok'],
    },
  ],
  'bellasos.automation:device.control': [
    { key: 'entityId', label: 'Entity ID', type: 'string', required: true },
    {
      key: 'action',
      label: 'Action',
      type: 'enum',
      options: ['turn_on', 'turn_off', 'toggle'],
      defaultValue: 'toggle',
    },
  ],
  'bellasos.voice:command': [
    { key: 'transcript', label: 'Transcript', type: 'string', required: true },
  ],
  'bellasos.voice:speak': [
    { key: 'text', label: 'Text', type: 'string', required: true },
  ],
  'bellasos.camera:ingest': [
    { key: 'camera', label: 'Camera', type: 'string', defaultValue: 'front' },
    { key: 'kind', label: 'Event kind', type: 'string', defaultValue: 'motion' },
    { key: 'detail', label: 'Detail', type: 'string' },
  ],
  'bellasos.coding:task.execute': [
    { key: 'goal', label: 'Goal', type: 'string', required: true, placeholder: 'Build a snake game…' },
  ],
  'bellasos.coding:task.refine': [
    { key: 'prompt', label: 'Edit prompt', type: 'string', required: true, placeholder: 'Fix arrow key controls…' },
    { key: 'projectId', label: 'Project ID', type: 'string', required: true },
  ],
  'bellasos.coding:project.get': [
    { key: 'id', label: 'Project ID', type: 'string', required: true },
  ],
  'bellasos.coding:project.save': [
    { key: 'id', label: 'Project ID', type: 'string' },
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'goal', label: 'Goal', type: 'string' },
    { key: 'html', label: 'HTML', type: 'string', required: true },
  ],
  'bellasos.llm:models.setEnabled': [
    { key: 'id', label: 'Model ID', type: 'string', required: true },
    { key: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
  ],
  'bellasos.llm:complete': [
    { key: 'prompt', label: 'Prompt', type: 'string', required: true },
    {
      key: 'taskType',
      label: 'Task type',
      type: 'enum',
      options: ['general', 'research', 'reasoning', 'coding', 'summarization', 'classification'],
    },
    { key: 'model', label: 'Model ID (optional)', type: 'string' },
  ],
};

export function actionKey(moduleId: string, actionName: string): string {
  return `${moduleId}:${actionName}`;
}

export function getActionFields(moduleId: string, actionName: string): ActionFieldSpec[] {
  return ACTION_FIELD_SPECS[actionKey(moduleId, actionName)] ?? [];
}

/** Actions with no input — invoke directly. */
export const NO_INPUT_ACTIONS = new Set([
  'bellasos.portfolio:accounts.list',
  'bellasos.portfolio:holdings.list',
  'bellasos.portfolio:watchlist.list',
  'bellasos.portfolio:summary',
  'bellasos.portfolio:analyze',
  'bellasos.portfolio:prices.refresh',
  'bellasos.portfolio:sync.export',
  'bellasos.portfolio:sync.pull',
  'bellasos.portfolio:sync.push',
  'bellasos.portfolio:sync.status',
  'bellasos.finance:investments.list',
  'bellasos.finance:investments.analyze',
  'bellasos.finance:investments.refreshPrices',
  'bellasos.finance:investments.syncToPortfolio',
  'bellasos.finance:accountTypes.list',
  'bellasos.finance:investmentTypes.list',
  'bellasos.research:reports.list',
  'bellasos.intelligence:briefings.list',
  'bellasos.intelligence:sectors.list',
  'bellasos.intelligence:alerts.list',
  'bellasos.social:platforms.list',
  'bellasos.social:drafts.list',
  'bellasos.automation:status',
  'bellasos.automation:devices.list',
  'bellasos.camera:events.list',
  'bellasos.coding:project.list',
  'bellasos.llm:models.list',
  'bellasos.llm:usage.summary',
]);

/** Worker-only actions — not exposed in UI. */
export const WORKER_ONLY_ACTIONS = new Set([
  'bellasos.social:scheduled.publishDue',
]);
