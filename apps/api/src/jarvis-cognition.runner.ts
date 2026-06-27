import {
  runCognitionTurn,
  executePlan,
  enrichExecutionPlanFromPlaybooks,
  buildPlaybookFallbackPlan,
  matchAdvisoryPlaybook,
  buildHeuristicPlan,
  type CognitionPlatform,
  type CognitionTurnInput,
  type PendingExecution,
} from '@bellasos/core-jarvis-cognition';
import type { JarvisPendingExecution } from './jarvis-sessions.service';
import type { Platform } from './platform.token';

function toPendingExecution(state: JarvisPendingExecution | undefined): PendingExecution | null {
  if (!state) return null;
  return state as PendingExecution;
}

export function buildCognitionPlatform(platform: Platform): CognitionPlatform {
  return {
    ai: platform.ai,
    registry: platform.registry,
    orchestrator: platform.orchestrator,
    config: platform.config,
  };
}

export async function runJarvisCognition(
  platform: Platform,
  input: Omit<CognitionTurnInput, 'pending'> & { pending?: JarvisPendingExecution | null },
) {
  return runCognitionTurn(buildCognitionPlatform(platform), {
    ...input,
    pending: toPendingExecution(input.pending ?? undefined),
  });
}

export async function runJarvisAdvisoryFallback(
  platform: Platform,
  input: Omit<CognitionTurnInput, 'pending'> & { pending?: JarvisPendingExecution | null },
) {
  const fallback = buildHeuristicPlan(input.message) ?? buildPlaybookFallbackPlan(input.message);
  if (!fallback) return null;
  return executePlan(
    buildCognitionPlatform(platform),
    {
      ...input,
      pending: toPendingExecution(input.pending ?? undefined),
    },
    enrichExecutionPlanFromPlaybooks(fallback, input.message),
  );
}

export { matchAdvisoryPlaybook };
