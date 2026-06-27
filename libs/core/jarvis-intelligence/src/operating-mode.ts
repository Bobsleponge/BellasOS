import {
  DOMAIN_IDS,
  OPERATING_MODE_SPECS,
  type AgentInfo,
  type DomainId,
  type OperatingMode,
} from '@bellasos/contracts';

const DOMAIN_SET = new Set<string>(DOMAIN_IDS);

/** Modes Jarvis may auto-switch into from General or when intent clearly shifts. */
export const USER_SELECTABLE_MODES: OperatingMode[] = [
  'general',
  'personal',
  'business',
  'wealth',
  'research',
  'focus',
];

const AGENT_DOMAINS: Record<string, DomainId[]> = {
  memory: ['life', 'knowledge', 'identity'],
  research: ['knowledge'],
  intelligence: ['intelligence', 'knowledge'],
  portfolio: ['wealth'],
  finance: ['wealth'],
  automation: ['automation', 'environment'],
  social: ['communications'],
  coding: ['execution'],
  operations: ['systems', 'execution', 'ventures'],
};

const MODULE_DOMAINS: Record<string, DomainId[]> = {
  'bellasos.finance-tracker': ['wealth'],
  'bellasos.portfolio': ['wealth'],
  'bellasos.research': ['knowledge'],
  'bellasos.intelligence': ['intelligence', 'knowledge'],
  'bellasos.coding': ['execution'],
  'bellasos.social': ['communications'],
  'bellasos.automation': ['automation', 'environment'],
  'bellasos.camera': ['environment'],
  'bellasos.workspace': ['execution', 'ventures'],
};

const APP_MODE: Record<string, OperatingMode> = {
  wealth: 'wealth',
  research: 'research',
  'coding-studio': 'focus',
  'harvi-and-co': 'business',
  truafrica: 'business',
  intelligence: 'research',
};

export function isOperatingMode(value: string): value is OperatingMode {
  return [
    'general',
    'personal',
    'business',
    'wealth',
    'research',
    'focus',
    'operator',
  ].includes(value);
}

export function isUserSelectableMode(value: string): value is OperatingMode {
  return USER_SELECTABLE_MODES.includes(value as OperatingMode);
}

export function getOperatingModeSpec(mode: OperatingMode) {
  return OPERATING_MODE_SPECS.find((s) => s.mode === mode);
}

export function modeDomainIds(mode: OperatingMode): DomainId[] {
  if (mode === 'general') {
    return ['life', 'ventures', 'wealth', 'knowledge', 'execution'];
  }
  const spec = getOperatingModeSpec(mode);
  const ids = (spec?.domainEmphasis ?? ['life']).filter(
    (d): d is DomainId => DOMAIN_SET.has(d),
  );
  return ids.length > 0 ? ids : ['life'];
}

export function resolveOperatingModeForContext(input: {
  applicationId?: string;
  operatingMode?: string;
  workspaceType?: string;
}): OperatingMode {
  if (input.operatingMode && isOperatingMode(input.operatingMode)) {
    return input.operatingMode;
  }
  if (input.workspaceType) {
    if (input.workspaceType === 'investment') return 'wealth';
    if (input.workspaceType === 'research') return 'research';
    if (input.workspaceType === 'project') return 'focus';
    if (input.workspaceType === 'business' || input.workspaceType === 'strategy') {
      return 'business';
    }
  }
  if (input.applicationId && APP_MODE[input.applicationId]) {
    return APP_MODE[input.applicationId]!;
  }
  return 'general';
}

export function domainsForOperatingMode(
  mode: OperatingMode,
  applicationId?: string,
  appDomains: Record<string, DomainId> = {},
): { primary: DomainId; secondary: DomainId[] } {
  if (mode === 'general') {
    if (applicationId && appDomains[applicationId]) {
      return {
        primary: appDomains[applicationId],
        secondary: ['intelligence', 'execution'],
      };
    }
    return { primary: 'life', secondary: ['ventures', 'wealth', 'knowledge', 'execution'] };
  }
  if (applicationId && appDomains[applicationId]) {
    const primary = appDomains[applicationId];
    const secondary = modeDomainIds(mode).filter((d) => d !== primary);
    return { primary, secondary };
  }
  const emphasis = modeDomainIds(mode);
  return {
    primary: emphasis[0] ?? 'life',
    secondary: emphasis.slice(1),
  };
}

export function formatOperatingModeForPrompt(mode: OperatingMode): string {
  const spec = getOperatingModeSpec(mode);
  if (!spec) return `Operating mode: ${mode}.`;
  const selfAware =
    mode === 'general'
      ? ' You may shift to a specialist mode when the user\'s intent clearly benefits — General stays the default for mixed days.'
      : ' Return to General when the user pivots domains or asks to be adaptable.';
  return [
    `Operating mode: ${mode}.`,
    `Domain emphasis: ${spec.domainEmphasis.join(', ')}.`,
    `Jarvis posture: ${spec.jarvisPosture}`,
    selfAware,
  ].join(' ');
}

export function formatModeRoutingRules(mode: OperatingMode): string {
  const spec = getOperatingModeSpec(mode);
  if (!spec) return '';
  if (mode === 'general') {
    return (
      `Active operating mode is "general" (auto-adapt). ${spec.jarvisPosture} ` +
      'Use the full agent and module catalog. ' +
      'Proactively set suggestedOperatingMode when a specialist mode would improve routing ' +
      '(wealth for finance, focus for coding, research for analysis). ' +
      'The platform auto-applies mode switches — the user does not need to ask.'
    );
  }
  return (
    `Active operating mode is "${mode}". ${spec.jarvisPosture} ` +
    `Prefer routing to specialists aligned with: ${spec.domainEmphasis.join(', ')}. ` +
    'Use other agents when the user clearly asks. ' +
    'Suggest "general" if the user pivots to a different domain or wants full flexibility.'
  );
}

function overlapsModeDomains(domains: DomainId[], mode: OperatingMode): boolean {
  if (mode === 'general') return true;
  const emphasis = new Set(modeDomainIds(mode));
  return domains.some((d) => emphasis.has(d));
}

export function isAgentPreferredForMode(agentType: string, mode: OperatingMode): boolean {
  if (mode === 'general') return true;
  const key = agentType.trim().toLowerCase();
  if (key === 'memory') return true;
  const domains = AGENT_DOMAINS[key] ?? ['systems'];
  return overlapsModeDomains(domains, mode);
}

export function isModulePreferredForMode(moduleId: string, mode: OperatingMode): boolean {
  if (mode === 'general') return true;
  if (moduleId === 'bellasos.workspace') {
    return mode === 'business' || mode === 'focus';
  }
  const domains = MODULE_DOMAINS[moduleId] ?? ['systems'];
  return overlapsModeDomains(domains, mode);
}

export function filterAgentsForMode(agents: AgentInfo[], mode: OperatingMode): AgentInfo[] {
  if (mode === 'general') return agents;
  const preferred = agents.filter((a) => isAgentPreferredForMode(a.type, mode));
  return preferred.length > 0 ? preferred : agents;
}

export function filterModulesForMode(moduleIds: string[], mode: OperatingMode): string[] {
  if (mode === 'general') return moduleIds;
  const preferred = moduleIds.filter((id) => isModulePreferredForMode(id, mode));
  return preferred.length > 0 ? preferred : moduleIds;
}

export function domainRelevanceBoostForMode(
  signalDomain: DomainId,
  mode: OperatingMode,
): number {
  if (mode === 'general') return 1.0;
  const emphasis = modeDomainIds(mode);
  if (emphasis[0] === signalDomain) return 1.25;
  if (emphasis.includes(signalDomain)) return 1.15;
  if (mode === 'wealth' && signalDomain === 'wealth') return 1.25;
  if (mode === 'research' && signalDomain === 'knowledge') return 1.25;
  if (mode === 'business' && signalDomain === 'ventures') return 1.2;
  if (mode === 'focus' && signalDomain === 'execution') return 1.25;
  if (mode === 'personal' && (signalDomain === 'life' || signalDomain === 'relationships')) {
    return 1.2;
  }
  return 1.0;
}

const DOMAIN_TO_MODE: Record<string, OperatingMode> = {
  finance: 'wealth',
  wealth: 'wealth',
  portfolio: 'wealth',
  coding: 'focus',
  research: 'research',
  intelligence: 'research',
  social: 'business',
  ventures: 'business',
  business: 'business',
  automation: 'personal',
  memory: 'personal',
  general: 'general',
};

export function modeFromAgentType(agentType?: string): OperatingMode | null {
  if (!agentType) return null;
  const key = agentType.trim().toLowerCase();
  if (key === 'finance' || key === 'portfolio') return 'wealth';
  if (key === 'research' || key === 'intelligence') return 'research';
  if (key === 'coding') return 'focus';
  if (key === 'social' || key === 'operations') return 'business';
  if (key === 'automation') return 'personal';
  return null;
}

export function modeFromOpenApp(openApp?: string): OperatingMode | null {
  if (!openApp) return null;
  if (openApp.includes('finance') || openApp.includes('portfolio') || openApp === 'wealth') {
    return 'wealth';
  }
  if (openApp.includes('research')) return 'research';
  if (openApp.includes('coding')) return 'focus';
  if (openApp.includes('harvi') || openApp.includes('truafrica')) return 'business';
  return null;
}

/** Explicit mode commands in user speech/text. */
export function parseExplicitModeFromMessage(message: string): OperatingMode | null {
  const m = message.toLowerCase();
  if (/\b(general mode|adapt(?:able)? mode|default mode|full flexibility)\b/.test(m)) {
    return 'general';
  }
  if (/\b(personal mode|life mode)\b/.test(m)) return 'personal';
  if (/\b(business mode|venture mode|work mode)\b/.test(m)) return 'business';
  if (/\b(wealth mode|finance mode|money mode)\b/.test(m)) return 'wealth';
  if (/\b(research mode|deep research mode)\b/.test(m)) return 'research';
  if (/\b(focus mode|deep work mode|heads down)\b/.test(m)) return 'focus';
  if (/\b(switch to|set mode to|change mode to)\s+(general|personal|business|wealth|research|focus)\b/.test(m)) {
    const match = m.match(
      /\b(switch to|set mode to|change mode to)\s+(general|personal|business|wealth|research|focus)\b/,
    );
    const word = match?.[2];
    if (word && isUserSelectableMode(word)) return word;
  }
  return null;
}

export interface AdaptiveModeInput {
  currentMode: OperatingMode;
  message: string;
  intentDomain?: string;
  agentType?: string;
  openApp?: string;
  applicationId?: string;
  suggestedMode?: string | null;
  suggestionConfidence?: number;
  /** User pinned mode via chip — skip automatic switches. */
  modeManual?: boolean;
  actionKind?: string;
}

export interface AdaptiveModeResult {
  mode: OperatingMode;
  switched: boolean;
  reason?: string;
}

/** Heuristic mode from message content — no voice command required. */
export function inferModeFromMessage(message: string): OperatingMode | null {
  const m = message.toLowerCase();
  if (
    /\b(net worth|finance tracker|portfolio|transaction|expense|income|investment|holdings|buy shares|sell shares|smart transaction)\b/.test(
      m,
    ) ||
    (/\b(rand|r\d{3,}|zar|nvidia|apple stock)\b/.test(m) && /\b(buy|sell|log|add|purchase)\b/.test(m))
  ) {
    return 'wealth';
  }
  if (
    /\b(research|analyze this company|sector brief|deep dive|competitive analysis|market report)\b/.test(
      m,
    )
  ) {
    return 'research';
  }
  if (
    /\b(build a game|build an app|coding studio|fix the code|refine the project|write code)\b/.test(
      m,
    )
  ) {
    return 'focus';
  }
  if (/\b(harvi|truafrica|venture|our business|client deliverable)\b/.test(m)) {
    return 'business';
  }
  if (/\b(lights|smart home|family|household|personal errand)\b/.test(m) && !/\bbusiness\b/.test(m)) {
    return 'personal';
  }
  return null;
}

function isBroadConversation(input: AdaptiveModeInput): boolean {
  if (inferModeFromMessage(input.message)) return false;
  if (input.agentType || input.openApp) return false;
  const domain = input.intentDomain?.toLowerCase() ?? '';
  if (domain && domain !== 'general' && domain !== 'chat') return false;
  if (input.actionKind && input.actionKind !== 'chat' && input.actionKind !== 'read') {
    return false;
  }
  return true;
}

/** Decide whether Jarvis should shift operating mode for this turn. */
export function resolveAdaptiveModeSwitch(input: AdaptiveModeInput): AdaptiveModeResult {
  const current = input.currentMode;

  if (input.modeManual) {
    const explicit = parseExplicitModeFromMessage(input.message);
    if (explicit && explicit !== current) {
      return {
        mode: explicit,
        switched: true,
        reason:
          explicit === 'general'
            ? 'General mode — auto-adapt enabled.'
            : `Switched to ${explicit}.`,
      };
    }
    return { mode: current, switched: false };
  }

  const explicit = parseExplicitModeFromMessage(input.message);
  if (explicit && explicit !== current) {
    return {
      mode: explicit,
      switched: true,
      reason:
        explicit === 'general'
          ? 'General mode — auto-adapt enabled.'
          : `Switched to ${explicit}.`,
    };
  }

  const suggestionThreshold = current === 'general' ? 0.72 : 0.82;

  if (
    input.suggestedMode &&
    isUserSelectableMode(input.suggestedMode) &&
    input.suggestedMode !== current &&
    (input.suggestionConfidence ?? 0) >= suggestionThreshold
  ) {
    const spec = getOperatingModeSpec(input.suggestedMode);
    return {
      mode: input.suggestedMode,
      switched: true,
      reason: spec
        ? input.suggestedMode === 'general'
          ? 'General — ready for anything.'
          : `Tuned for ${input.suggestedMode}.`
        : undefined,
    };
  }

  const fromAgent = modeFromAgentType(input.agentType);
  const fromApp = modeFromOpenApp(input.openApp) ?? (input.applicationId ? APP_MODE[input.applicationId] : null);
  const fromDomain = input.intentDomain
    ? (DOMAIN_TO_MODE[input.intentDomain.toLowerCase()] ?? null)
    : null;
  const fromMessage = inferModeFromMessage(input.message);
  const inferred = fromAgent ?? fromApp ?? fromDomain ?? fromMessage;

  if (!inferred || inferred === current) {
    if (current !== 'general' && isBroadConversation(input)) {
      return {
        mode: 'general',
        switched: true,
        reason: 'General — ready for anything.',
      };
    }
    return { mode: current, switched: false };
  }

  if (current === 'general') {
    const spec = getOperatingModeSpec(inferred);
    return {
      mode: inferred,
      switched: true,
      reason: spec ? `Tuned for ${inferred}.` : undefined,
    };
  }

  const currentDomains = new Set(modeDomainIds(current));
  const inferredDomains = new Set(modeDomainIds(inferred));
  const overlaps = [...inferredDomains].some((d) => currentDomains.has(d));
  if (!overlaps) {
    return {
      mode: inferred,
      switched: true,
      reason: `Tuned for ${inferred}.`,
    };
  }

  return { mode: current, switched: false };
}
