import type { AIGateway } from '@bellasos/contracts';
import { runHybridContentPipeline } from '@bellasos/module-hybrid';
import type { PortfolioAnalysis } from './types';

export async function runPortfolioAdvisePipeline(
  ai: AIGateway,
  input: {
    traceId: string;
    analysis: PortfolioAnalysis;
    question?: string;
  },
) {
  const request =
    input.question?.trim() ||
    'Provide a portfolio review with allocation commentary, concentration risks, and actionable next steps.';
  const facts = JSON.stringify(input.analysis, null, 2);
  const result = await runHybridContentPipeline(ai, {
    traceId: input.traceId,
    request,
    contextBlock: `Portfolio analysis snapshot:\n${facts}`,
    taskType: 'reasoning',
    mathFactsBlock: facts,
    leadSystem:
      'You are a wealth advisor lead (South Africa, ZAR). Plan advice using ONLY the verified numbers provided.',
    leadHints:
      'acceptanceCriteria must include: uses provided totals, mentions diversification, gives 2-3 actionable steps. Never invent numbers.',
    executeSystem:
      'You are a personal wealth advisor for a South African household (ZAR). ' +
      'Use ONLY the verified portfolio numbers provided — never recalculate totals, gains, or percentages. ' +
      'Be concise, practical, and tax-aware (TFSA, RA where relevant).',
  });
  return result;
}
