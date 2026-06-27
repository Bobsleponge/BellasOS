import type { AIGateway } from '@bellasos/contracts';
import { runHybridContentPipeline } from '@bellasos/module-hybrid';

export async function runIntelligenceBriefingPipeline(
  ai: AIGateway,
  input: {
    traceId: string;
    cadence: string;
    sectors: string[];
    contextBlock: string;
    fetchedAt: string;
    question?: string;
  },
) {
  const request =
    input.question?.trim() ||
    `Produce a ${input.cadence} intelligence briefing for sectors: ${input.sectors.join(', ')}`;
  const result = await runHybridContentPipeline(ai, {
    traceId: input.traceId,
    request,
    contextBlock: `Live sources (as of ${input.fetchedAt}):\n${input.contextBlock}`,
    taskType: 'reasoning',
    leadSystem:
      'You are an intelligence desk lead. Plan a briefing with per-sector structure: Signal, Why it matters, Watch items.',
    leadHints:
      'Prioritize signal over noise. acceptanceCriteria should check each sector is covered and sources cited.',
    executeSystem:
      'You are an intelligence analyst. Use ONLY the live sources provided. ' +
      'For each sector give: Signal, Why it matters, Watch items. Cite sources.',
  });
  return result;
}
