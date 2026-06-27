import type { AIGateway } from '@bellasos/contracts';
import { runHybridContentPipeline } from '@bellasos/module-hybrid';

export async function runResearchPipeline(
  ai: AIGateway,
  input: {
    traceId: string;
    subject: string;
    kind: string;
    contextBlock: string;
    fetchedAt: string;
  },
) {
  const request = `Research the ${input.kind}: ${input.subject}`;
  const result = await runHybridContentPipeline(ai, {
    traceId: input.traceId,
    request,
    contextBlock: `Live sources (as of ${input.fetchedAt}):\n${input.contextBlock}`,
    taskType: 'research',
    leadSystem:
      'You are a senior research lead. Plan a rigorous report. Sections should include Overview, Key Facts, Risks, Opportunities, and Investment Thesis when relevant.',
    leadHints:
      'Require citation of source titles/URLs. Flag thin source coverage in acceptanceCriteria.',
    executeSystem:
      'You are a meticulous research analyst. Use ONLY the provided live sources. ' +
      'Cite source titles/URLs inline. If sources are thin, say so explicitly. ' +
      'Do not mention internal routing or models.',
  });
  return result;
}
