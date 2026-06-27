import type { ContextStack, DayPhase, DomainId, DecisionContext, GoalContext, OperatingMode, WorldContext, WorkspaceContext } from '@bellasos/contracts';
import { formatApplicationContextForPrompt } from '@bellasos/contracts';
import { formatDecisionsForPrompt } from './decision-context';
import { formatGoalsForPrompt } from './goal-context';
import {
  domainsForOperatingMode,
  domainRelevanceBoostForMode,
  formatOperatingModeForPrompt,
  resolveOperatingModeForContext,
} from './operating-mode';
import { formatWorldContextForPrompt } from './world-context';
import { formatWorkspaceContextForPrompt } from './workspace-context';
import type { BriefingRhythm, ContextResolveInput } from './types';

const APP_DOMAINS: Record<string, DomainId> = {
  wealth: 'wealth',
  research: 'knowledge',
  intelligence: 'intelligence',
  'harvi-and-co': 'ventures',
  truafrica: 'ventures',
  automation: 'environment',
  'coding-studio': 'execution',
  communications: 'communications',
};

const APP_ORGS: Record<string, string> = {
  'harvi-and-co': 'org:harvi',
  truafrica: 'org:truafrica',
};

export function rhythmFromHour(hour: number): BriefingRhythm {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

export function temporalPhaseFromHour(hour: number): ContextStack['temporal']['phase'] {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function dayPhaseFromRhythm(rhythm: BriefingRhythm): DayPhase {
  if (rhythm === 'morning') return 'arrival';
  if (rhythm === 'midday') return 'execution';
  if (rhythm === 'evening') return 'synthesis';
  return 'background';
}

export function inferOperatingMode(
  applicationId?: string,
  explicit?: string,
): OperatingMode {
  return resolveOperatingModeForContext({
    applicationId,
    operatingMode: explicit,
  });
}

export function applicationFromPathname(pathname: string, search?: string): string | undefined {
  if (pathname.startsWith('/finance')) return 'wealth';
  if (pathname.startsWith('/console')) {
    const params = new URLSearchParams(search ?? '');
    const view = params.get('view') ?? '';
    if (view.includes('bellasos.research')) return 'research';
    if (view.includes('bellasos.intelligence')) return 'intelligence';
    if (view.includes('bellasos.automation')) return 'automation';
    if (view.includes('bellasos.coding')) return 'coding-studio';
    if (view.includes('bellasos.social')) return 'communications';
  }
  return undefined;
}

export function resolveContextStack(input: ContextResolveInput): ContextStack {
  const now = new Date();
  const hour = now.getHours();
  const workspaceContext = input.workspaceContext;
  const applicationId =
    input.applicationId ?? workspaceContext?.workspace.applicationIds[0];
  const mode = resolveOperatingModeForContext({
    applicationId,
    operatingMode: input.operatingMode,
    workspaceType: workspaceContext?.workspace.type,
  });
  const domainContext = domainsForOperatingMode(mode, applicationId, APP_DOMAINS);
  const primaryDomain = domainContext.primary;
  const goalContext = input.goalContext;
  const decisionContext = input.decisionContext;

  let focus = input.codingProjectId
    ? {
        entity: {
          entityType: 'coding_project' as const,
          id: input.codingProjectId,
          label: input.codingProjectId,
        },
        pinned: false,
        lastActiveAt: now.toISOString(),
      }
    : undefined;

  if (!focus && workspaceContext?.workspace) {
    focus = {
      entity: {
        entityType: 'workspace',
        id: workspaceContext.workspace.id,
        label: workspaceContext.workspace.title,
      },
      pinned: false,
      lastActiveAt: now.toISOString(),
    };
  }

  if (!focus && decisionContext?.focusDecisionId) {
    const focusDecision = decisionContext.decisions.find(
      (d) => d.id === decisionContext.focusDecisionId,
    );
    if (focusDecision) {
      focus = {
        entity: {
          entityType: 'decision',
          id: focusDecision.id,
          label: focusDecision.title,
        },
        pinned: false,
        lastActiveAt: now.toISOString(),
      };
    }
  }

  if (!focus && goalContext?.focusGoalId) {
    const focusGoal = goalContext.goals.find((g) => g.id === goalContext.focusGoalId);
    if (focusGoal) {
      focus = {
        entity: {
          entityType: 'goal',
          id: focusGoal.id,
          label: focusGoal.objective,
        },
        pinned: false,
        lastActiveAt: now.toISOString(),
      };
    }
  }

  const prioritySummary = goalContext
    ? formatGoalsForPrompt(goalContext)
    : undefined;

  return {
    session: {
      sessionId: input.sessionId ?? 'anonymous',
    },
    focus,
    domain: {
      primary: primaryDomain,
      secondary: domainContext.secondary,
    },
    venture: applicationId && APP_ORGS[applicationId]
      ? { organizationIds: [APP_ORGS[applicationId]!] }
      : undefined,
    temporal: {
      phase: temporalPhaseFromHour(hour),
      urgency:
        (input.pendingApprovals ?? 0) > 0 ? 'high' : 'normal',
    },
    modality: 'text',
    attention: {
      pendingApprovals: input.pendingApprovals ?? 0,
      activeAlerts: input.unreadNotifications ?? 0,
      openThreads: input.openResearchReports ?? 0,
      prioritySummary: prioritySummary || undefined,
    },
    operatingMode: mode,
    workspace: workspaceContext?.workspace
      ? {
          workspaceId: workspaceContext.workspace.id,
          title: workspaceContext.workspace.title,
          type: workspaceContext.workspace.type,
          objective: workspaceContext.workspace.objective,
        }
      : undefined,
  };
}

export function domainRelevanceBoost(
  signalDomain: DomainId,
  context: ContextStack,
): number {
  if (signalDomain === context.domain.primary) return 1.3;
  if (context.domain.secondary.includes(signalDomain)) return 1.15;
  const modeBoost = domainRelevanceBoostForMode(signalDomain, context.operatingMode);
  if (modeBoost > 1.0) return modeBoost;
  if (context.domain.primary === 'intelligence' && signalDomain === 'intelligence') return 1.2;
  if (context.domain.primary === 'wealth' && signalDomain === 'intelligence') return 1.1;
  return 1.0;
}

export function greetingForRhythm(
  rhythm: BriefingRhythm,
  displayName?: string,
): string {
  const name = displayName?.trim();
  const suffix = name ? ` ${name}` : '';
  if (rhythm === 'morning') return `Good morning${suffix}.`;
  if (rhythm === 'midday') return `Good afternoon${suffix}.`;
  if (rhythm === 'evening') return `Good evening${suffix}.`;
  return `Hello${suffix}.`;
}

export function formatContextForPrompt(
  context: ContextStack,
  goalContext?: GoalContext,
  decisionContext?: DecisionContext,
  worldContext?: WorldContext,
  workspaceContext?: WorkspaceContext | null,
  applicationId?: string,
): string {
  const parts = [
    formatOperatingModeForPrompt(context.operatingMode),
    `Primary domain: ${context.domain.primary}`,
    `Time phase: ${context.temporal.phase}`,
  ];
  if (context.focus?.entity?.label) {
    parts.push(`Focus: ${context.focus.entity.label}`);
  }
  if (context.venture?.organizationIds.length) {
    parts.push(`Venture: ${context.venture.organizationIds.join(', ')}`);
  }
  if (context.attention.pendingApprovals > 0) {
    parts.push(`Pending approvals: ${context.attention.pendingApprovals}`);
  }
  if (goalContext) {
    const goalsLine = formatGoalsForPrompt(goalContext);
    if (goalsLine) parts.push(`Active goals: ${goalsLine}`);
  } else if (context.attention.prioritySummary) {
    parts.push(`Active goals: ${context.attention.prioritySummary}`);
  }
  if (decisionContext) {
    const decisionsLine = formatDecisionsForPrompt(decisionContext);
    if (decisionsLine) parts.push(`Open decisions: ${decisionsLine}`);
    if (decisionContext.openDecisions.length > 0) {
      parts.push(`Open decision count: ${decisionContext.openDecisions.length}`);
    }
  }
  const worldLine = formatWorldContextForPrompt(worldContext);
  if (worldLine) parts.push(worldLine);
  const workspaceLine = formatWorkspaceContextForPrompt(workspaceContext);
  if (workspaceLine) parts.push(workspaceLine);
  const appLine = formatApplicationContextForPrompt(applicationId);
  if (appLine) parts.push(appLine);
  return parts.join('. ') + '.';
}
