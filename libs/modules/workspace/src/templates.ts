import type { DomainId, FocusKind, WorkspaceType } from '@bellasos/contracts';

export interface WorkspaceTemplate {
  type: WorkspaceType;
  title: string;
  objective: string;
  domainId: DomainId;
  organizationId?: string;
  applicationIds: string[];
  worldSectorTags: string[];
  keywords: string[];
  focusKind: FocusKind;
  openApp?: string;
}

const HARVI_TEMPLATE: WorkspaceTemplate = {
  type: 'business',
  title: 'Grow Harvi',
  objective: 'Increase weekly orders and venture momentum for Harvi & Co',
  domainId: 'ventures',
  organizationId: 'org:harvi',
  applicationIds: ['harvi-and-co', 'intelligence'],
  worldSectorTags: ['user_business', 'technology'],
  keywords: ['Harvi', 'orders', 'growth'],
  focusKind: 'planning',
  openApp: 'harvi-and-co',
};

const TRUAFRICA_TEMPLATE: WorkspaceTemplate = {
  type: 'strategy',
  title: 'TruAfrica Strategy',
  objective: 'Design pricing and growth strategy for TruAfrica',
  domainId: 'ventures',
  organizationId: 'org:truafrica',
  applicationIds: ['truafrica', 'research', 'intelligence'],
  worldSectorTags: ['user_business', 'south_africa'],
  keywords: ['TruAfrica', 'pricing', 'strategy'],
  focusKind: 'planning',
  openApp: 'truafrica',
};

const PROPERTY_TEMPLATE: WorkspaceTemplate = {
  type: 'investment',
  title: 'Property Acquisition',
  objective: 'Evaluate and compare property investment opportunities',
  domainId: 'wealth',
  applicationIds: ['wealth', 'research', 'intelligence'],
  worldSectorTags: ['markets', 'macroeconomics', 'south_africa'],
  keywords: ['property', 'acquisition', 'investment'],
  focusKind: 'analysis',
  openApp: 'wealth',
};

const RESEARCH_TEMPLATE: WorkspaceTemplate = {
  type: 'research',
  title: 'Research Workspace',
  objective: 'Deep research and synthesis',
  domainId: 'knowledge',
  applicationIds: ['research', 'intelligence'],
  worldSectorTags: ['ai', 'technology'],
  keywords: [],
  focusKind: 'research',
  openApp: 'bellasos.research',
};

const PROJECT_TEMPLATE: WorkspaceTemplate = {
  type: 'project',
  title: 'Project Workspace',
  objective: 'Build and ship a product or system',
  domainId: 'execution',
  applicationIds: ['coding-studio'],
  worldSectorTags: ['user_projects', 'technology'],
  keywords: [],
  focusKind: 'project',
  openApp: 'bellasos.coding',
};

export function templateFromMessage(message: string): WorkspaceTemplate | null {
  const m = message.toLowerCase();
  if (/grow harvi|help me grow harvi|harvi growth/.test(m)) return { ...HARVI_TEMPLATE };
  if (/truafrica|tru africa/.test(m) && /pric|strateg|design|grow/.test(m)) {
    return { ...TRUAFRICA_TEMPLATE };
  }
  if (/property|acquisition|evaluate another property|real estate/.test(m)) {
    return { ...PROPERTY_TEMPLATE };
  }
  if (/research\s+\w+|help me research/.test(m)) {
    const subject = message.replace(/help me research\s+/i, '').trim() || 'Research topic';
    return {
      ...RESEARCH_TEMPLATE,
      title: `Research: ${subject.slice(0, 60)}`,
      objective: `Research and synthesize findings on ${subject}`,
      keywords: subject.split(/\s+/).slice(0, 5),
    };
  }
  if (/build|project|coding|ship/.test(m) && !/finance|stock|invest/.test(m)) {
    return { ...PROJECT_TEMPLATE, title: 'Build Project', objective: message.trim() };
  }
  return null;
}

export function templateForType(type: WorkspaceType): WorkspaceTemplate {
  switch (type) {
    case 'business':
      return { ...HARVI_TEMPLATE };
    case 'strategy':
      return { ...TRUAFRICA_TEMPLATE };
    case 'investment':
      return { ...PROPERTY_TEMPLATE };
    case 'research':
      return { ...RESEARCH_TEMPLATE };
    case 'project':
      return { ...PROJECT_TEMPLATE };
    default:
      return {
        type: 'custom',
        title: 'Custom Workspace',
        objective: 'Work toward a defined objective',
        domainId: 'execution',
        applicationIds: ['intelligence'],
        worldSectorTags: [],
        keywords: [],
        focusKind: 'general',
      };
  }
}
