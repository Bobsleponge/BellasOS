import type { AIGateway } from '@bellasos/contracts';
import { runHybridContentPipeline } from '@bellasos/module-hybrid';

export interface FinanceSummarySnapshot {
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  investmentValue: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  exchangeRateUsdZar?: number | null;
  asOf: string;
  counts?: Record<string, number>;
}

export async function runFinanceSummaryAdvisePipeline(
  ai: AIGateway,
  input: {
    traceId: string;
    summary: FinanceSummarySnapshot;
    question?: string;
  },
) {
  const request =
    input.question?.trim() ||
    'Summarize my financial position and give practical guidance on cashflow, net worth, and priorities.';
  const facts = JSON.stringify(input.summary, null, 2);
  const result = await runHybridContentPipeline(ai, {
    traceId: input.traceId,
    request,
    contextBlock: `Live Finance-Tracker summary:\n${facts}`,
    taskType: 'reasoning',
    mathFactsBlock: facts,
    leadSystem:
      'You are a household CFO lead (South Africa, ZAR). Plan advice grounded in verified Finance-Tracker numbers only.',
    leadHints:
      'For currency math questions, acceptanceCriteria should require using provided exchangeRateUsdZar if present — never guess FX.',
    executeSystem:
      'You are a personal finance advisor (ZAR). Use ONLY the verified summary numbers. ' +
      'Never recalculate net worth, cashflow, or FX conversions. Match answer depth to the question: ' +
      'net-worth-only questions get one sentence; financial status/overview questions may include assets, liabilities, income, expenses, and cashflow. Be actionable and concise.',
  });
  return result;
}
