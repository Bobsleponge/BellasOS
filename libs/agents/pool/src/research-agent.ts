import {
  CoreEvents,
  type AgentResult,
  type AgentTask,
  type AgentType,
} from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';

/**
 * Research Agent: investigates companies/industries, produces a structured
 * report and an optional investment thesis, persists findings to long-term
 * memory, and emits `research.completed`.
 */
export class ResearchAgent extends BaseAgent {
  readonly type: AgentType = 'research';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const subject = String(
      task.input.subject ?? task.input.query ?? task.input.prompt ?? 'unknown',
    );
    const kind = String(task.input.kind ?? 'company');
    const ownerId = String(task.input.ownerId ?? task.actorId ?? 'system');

    // Ground the report with any relevant prior knowledge.
    const priors = await this.deps.memory.recall({
      ownerId,
      query: subject,
      tier: 'long',
      limit: 5,
    });
    const context = priors.map((p) => `- ${p.content}`).join('\n');

    const completion = await this.deps.ai.complete({
      taskType: 'research',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous research analyst. Produce a concise, ' +
            'well-structured report with sections: Overview, Key Facts, ' +
            'Risks, Opportunities, and (if relevant) an Investment Thesis.',
        },
        {
          role: 'user',
          content:
            `Research the ${kind}: "${subject}".` +
            (context ? `\n\nKnown context:\n${context}` : ''),
        },
      ],
    });

    const report = {
      subject,
      kind,
      content: completion.text,
      model: completion.model,
      createdAt: new Date().toISOString(),
    };

    await this.deps.memory.remember({
      tier: 'long',
      ownerId,
      content: `Research report on ${subject}:\n${completion.text}`,
      tags: ['research', kind, subject],
      sourceRef: { type: 'research', subject },
    });

    return {
      output: { report },
      emit: [{ type: CoreEvents.ResearchCompleted, payload: report }],
    };
  }
}
