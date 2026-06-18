import {
  CoreEvents,
  type AgentResult,
  type AgentTask,
  type AgentType,
} from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';

const DEFAULT_SECTORS = [
  'AI',
  'Mining',
  'Energy',
  'Defence',
  'Healthcare',
  'Telecommunications',
  'Space',
  'Macroeconomics',
  'South Africa',
];

/**
 * Intelligence Agent: sector briefings and trend analysis.
 * Uses bellasos.intelligence module when available.
 */
export class IntelligenceAgent extends BaseAgent {
  readonly type: AgentType = 'intelligence';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const ownerId = String(task.input.ownerId ?? task.actorId ?? 'system');
    const sectors = (task.input.sectors as string[] | undefined) ?? DEFAULT_SECTORS;
    const cadence = String(task.input.cadence ?? 'daily');
    const focus = String(task.input.prompt ?? '').trim();

    if (this.deps.modules) {
      const result = await this.deps.modules.invoke(
        'bellasos.intelligence',
        'brief.generate',
        { cadence },
        task,
      );
      return { output: result as Record<string, unknown> };
    }

    const completion = await this.deps.ai.complete({
      taskType: 'reasoning',
      traceId: task.traceId,
      messages: [
        {
          role: 'system',
          content:
            'You are an intelligence analyst. Produce a structured briefing covering the requested sectors. For each sector give: Signal, Why it matters, and Watch items.',
        },
        {
          role: 'user',
          content: focus
            ? `${focus}\n\n(Relevant sectors: ${sectors.join(', ')}.)`
            : `Sectors: ${sectors.join(', ')}.`,
        },
      ],
    });

    const briefing = {
      cadence,
      sectors,
      content: completion.text,
      createdAt: new Date().toISOString(),
    };

    await this.deps.memory.remember({
      tier: 'long',
      ownerId,
      content: `${cadence} intelligence briefing:\n${completion.text}`,
      tags: ['intelligence', cadence, ...sectors],
      sourceRef: { type: 'briefing', cadence },
    });

    return {
      output: { briefing },
      emit: [
        {
          type: CoreEvents.AgentReportGenerated,
          payload: { kind: 'intelligence', briefing },
        },
      ],
    };
  }
}
