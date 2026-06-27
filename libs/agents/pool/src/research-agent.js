"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchAgent = void 0;
const contracts_1 = require("@bellasos/contracts");
const agents_framework_1 = require("@bellasos/agents-framework");
/**
 * Research Agent: investigates companies/industries, produces a structured
 * report and persists findings. Uses bellasos.research module when available.
 */
class ResearchAgent extends agents_framework_1.BaseAgent {
    type = 'research';
    async execute(task) {
        const subject = String(task.input.subject ?? task.input.query ?? task.input.prompt ?? 'unknown');
        const kind = String(task.input.kind ?? 'company');
        const ownerId = String(task.input.ownerId ?? task.actorId ?? 'system');
        if (this.deps.modules && subject !== 'unknown') {
            const result = await this.deps.modules.invoke('bellasos.research', 'run', { subject, kind }, task);
            return { output: result };
        }
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
                    content: 'You are a meticulous research analyst. Produce a concise, well-structured report with sections: Overview, Key Facts, Risks, Opportunities, and (if relevant) an Investment Thesis.',
                },
                {
                    role: 'user',
                    content: `Research the ${kind}: "${subject}".` +
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
            emit: [{ type: contracts_1.CoreEvents.ResearchCompleted, payload: report }],
        };
    }
}
exports.ResearchAgent = ResearchAgent;
//# sourceMappingURL=research-agent.js.map