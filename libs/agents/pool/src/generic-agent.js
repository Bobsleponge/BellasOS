"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericAgent = void 0;
const agents_framework_1 = require("@bellasos/agents-framework");
/**
 * A dynamic, LLM-driven agent. Created at runtime from a plain-language role
 * description (no code changes, no restart). It interprets a natural-language
 * instruction with the AI gateway, grounded in long-term memory, and persists
 * what it learns. This is what powers "create an agent and just talk to it".
 */
class GenericAgent extends agents_framework_1.BaseAgent {
    type = 'operations';
    _name;
    role;
    taskType;
    constructor(deps, config) {
        super(deps);
        this._name = config.name;
        this.role = config.role;
        this.taskType = config.taskType ?? 'reasoning';
    }
    get name() {
        return this._name;
    }
    async execute(task) {
        const prompt = String(task.input.prompt ?? task.input.query ?? task.input.content ?? '').trim();
        const ownerId = String(task.input.ownerId ?? task.actorId ?? 'system');
        if (!prompt) {
            return {
                output: {
                    response: `I'm "${this._name}". Tell me what you'd like me to do.`,
                },
            };
        }
        // Ground the response with anything relevant this agent learned before.
        const priors = await this.deps.memory.recall({
            ownerId,
            query: prompt,
            tier: 'long',
            limit: 5,
        });
        const context = priors.map((p) => `- ${p.content}`).join('\n');
        const completion = await this.deps.ai.complete({
            taskType: this.taskType,
            traceId: task.traceId,
            messages: [
                {
                    role: 'system',
                    content: this.role ||
                        `You are ${this._name}, a helpful autonomous agent. ` +
                            'Interpret the user request, decide what is being asked, and do it.',
                },
                {
                    role: 'user',
                    content: context
                        ? `${prompt}\n\nRelevant context you remember:\n${context}`
                        : prompt,
                },
            ],
        });
        await this.deps.memory.remember({
            tier: 'long',
            ownerId,
            content: `[${this._name}] ${prompt}\n=> ${completion.text}`,
            tags: ['agent', this._name],
            sourceRef: { type: 'agent', agent: this._name },
        });
        return {
            output: {
                agent: this._name,
                response: completion.text,
                model: completion.model,
            },
        };
    }
}
exports.GenericAgent = GenericAgent;
//# sourceMappingURL=generic-agent.js.map