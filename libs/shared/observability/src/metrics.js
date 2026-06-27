"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLatency = exports.aiCostUsd = exports.aiRequests = exports.moduleActions = exports.eventsPublished = exports.httpRequests = exports.metricsRegistry = void 0;
exports.renderMetrics = renderMetrics;
const prom_client_1 = require("prom-client");
exports.metricsRegistry = new prom_client_1.Registry();
exports.metricsRegistry.setDefaultLabels({ service: 'bellasos' });
(0, prom_client_1.collectDefaultMetrics)({ register: exports.metricsRegistry });
exports.httpRequests = new prom_client_1.Counter({
    name: 'bellasos_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [exports.metricsRegistry],
});
exports.eventsPublished = new prom_client_1.Counter({
    name: 'bellasos_events_published_total',
    help: 'Total events published to the bus',
    labelNames: ['type'],
    registers: [exports.metricsRegistry],
});
exports.moduleActions = new prom_client_1.Counter({
    name: 'bellasos_module_actions_total',
    help: 'Total module actions invoked',
    labelNames: ['module', 'action', 'outcome'],
    registers: [exports.metricsRegistry],
});
exports.aiRequests = new prom_client_1.Counter({
    name: 'bellasos_ai_requests_total',
    help: 'Total AI provider requests',
    labelNames: ['provider', 'model', 'task'],
    registers: [exports.metricsRegistry],
});
exports.aiCostUsd = new prom_client_1.Counter({
    name: 'bellasos_ai_cost_usd_total',
    help: 'Estimated AI spend in USD',
    labelNames: ['provider', 'model'],
    registers: [exports.metricsRegistry],
});
exports.aiLatency = new prom_client_1.Histogram({
    name: 'bellasos_ai_latency_ms',
    help: 'AI request latency in ms',
    labelNames: ['provider', 'model'],
    buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
    registers: [exports.metricsRegistry],
});
async function renderMetrics() {
    return exports.metricsRegistry.metrics();
}
//# sourceMappingURL=metrics.js.map