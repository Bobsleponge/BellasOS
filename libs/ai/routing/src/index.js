"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingEngine = void 0;
const contracts_1 = require("@bellasos/contracts");
__exportStar(require("./jarvis-hub"), exports);
/** Maps a task type to a capability the chosen model must support. */
const TASK_CAPABILITY = {
    reasoning: 'reasoning',
    research: 'reasoning',
    coding: 'reasoning',
    vision: 'vision',
    embedding: 'embedding',
};
/**
 * The Routing Engine selects a concrete model for a request based on cost,
 * latency, privacy and task type. Restricted data and the `privacy` strategy
 * force local models. When nothing is configured it falls back to the mock
 * provider so the platform always has a working path.
 */
class RoutingEngine {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    routeCompletion(request) {
        if (request.model) {
            const pinned = this.ctx.models.find((m) => m.id === request.model);
            if (pinned)
                return pinned;
        }
        const cap = request.taskType
            ? (TASK_CAPABILITY[request.taskType] ?? 'chat')
            : 'chat';
        return this.select({
            capability: cap === 'embedding' ? 'chat' : cap,
            strategy: this.strategyFor(request),
            forceLocal: this.forceLocal(request),
        });
    }
    routeEmbedding(request) {
        if (request.model) {
            const pinned = this.ctx.models.find((m) => m.id === request.model);
            if (pinned)
                return pinned;
        }
        return this.select({
            capability: 'embedding',
            strategy: this.ctx.defaultStrategy,
            forceLocal: request.classification === 'restricted' ||
                this.ctx.defaultStrategy === 'privacy',
        });
    }
    strategyFor(request) {
        if (request.classification === 'restricted' ||
            request.classification === 'confidential') {
            return 'privacy';
        }
        return this.ctx.defaultStrategy;
    }
    forceLocal(request) {
        return (request.classification === 'restricted' ||
            this.ctx.defaultStrategy === 'privacy');
    }
    select(opts) {
        let candidates = this.ctx.models.filter((m) => m.enabled && m.capabilities.includes(opts.capability));
        if (opts.forceLocal)
            candidates = candidates.filter((m) => m.local);
        // Only models whose provider is usable (configured or local).
        let usable = candidates.filter((m) => m.local || this.ctx.isProviderConfigured(m.provider));
        if (usable.length === 0) {
            // Guaranteed fallback to the mock provider.
            const mock = this.ctx.models.find((m) => m.provider === 'mock' && m.capabilities.includes(opts.capability));
            if (mock)
                return mock;
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `No model available for capability ${opts.capability}`);
        }
        usable.sort((a, b) => this.score(a, opts.strategy) - this.score(b, opts.strategy));
        return usable[0];
    }
    /** Lower score wins. */
    score(model, strategy) {
        switch (strategy) {
            case 'cost':
                return (model.cost.inputPerMTokensUsd + model.cost.outputPerMTokensUsd);
            case 'latency':
                return model.latencyHint ?? 99;
            case 'privacy':
                return model.local ? 0 : 100;
            case 'quality':
            default:
                // Heuristic: prefer more parameters + larger context + reasoning, and
                // strongly de-prefer the offline mock provider.
                return (-(model.paramsB ?? 0) -
                    (model.contextWindow / 100000) -
                    (model.capabilities.includes('reasoning') ? 5 : 0) -
                    (model.provider === 'mock' ? -50 : 0));
        }
    }
}
exports.RoutingEngine = RoutingEngine;
//# sourceMappingURL=index.js.map