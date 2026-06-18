import type { AgentResult, AgentTask, AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';

/**
 * The remaining specialist agents. Each is a thin, working scaffold that uses
 * the AI gateway; richer domain logic is layered on by the feature modules that
 * call them. Defined together to keep the pool cohesive.
 */

export class PortfolioAgent extends BaseAgent {
  readonly type: AgentType = 'portfolio';
  protected async execute(task: AgentTask): Promise<AgentResult> {
    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are a portfolio analyst. Comment on allocation, risk and ' +
            'notable changes for the request below.',
        },
        {
          role: 'user',
          content: String(task.input.prompt ?? JSON.stringify(task.input)),
        },
      ],
    });
    return { output: { analysis: res.text } };
  }
}

export class AutomationAgent extends BaseAgent {
  readonly type: AgentType = 'automation';
  protected async execute(task: AgentTask): Promise<AgentResult> {
    // Translates a natural-language request into a device action plan.
    const intent = String(task.input.prompt ?? task.input.intent ?? 'noop');
    return {
      output: {
        plan: { intent, steps: [] },
      },
    };
  }
}

export class SocialAgent extends BaseAgent {
  readonly type: AgentType = 'social';
  protected async execute(task: AgentTask): Promise<AgentResult> {
    const res = await this.deps.ai.complete({
      taskType: 'general',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are a social media copywriter. Draft an on-brand post for ' +
            'the requested platform. Keep within platform norms.',
        },
        {
          role: 'user',
          content: String(task.input.prompt ?? JSON.stringify(task.input)),
        },
      ],
    });
    return { output: { draft: res.text } };
  }
}

export class CodingAgent extends BaseAgent {
  readonly type: AgentType = 'coding';
  protected async execute(task: AgentTask): Promise<AgentResult> {
    const res = await this.deps.ai.complete({
      taskType: 'coding',
      traceId: task.traceId,
      messages: [
        { role: 'system', content: 'You are a senior software engineer.' },
        { role: 'user', content: String(task.input.prompt ?? '') },
      ],
    });
    return { output: { result: res.text } };
  }
}

export class OperationsAgent extends BaseAgent {
  readonly type: AgentType = 'operations';
  protected async execute(task: AgentTask): Promise<AgentResult> {
    const prompt = String(task.input.prompt ?? '').trim();
    if (!prompt) {
      return {
        output: {
          status: 'ok',
          checkedAt: new Date().toISOString(),
          note: 'operations health summary placeholder',
        },
      };
    }
    const res = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are an operations agent. Produce a concise, actionable ' +
            'response or plan for the request.',
        },
        { role: 'user', content: prompt },
      ],
    });
    return { output: { response: res.text, checkedAt: new Date().toISOString() } };
  }
}
