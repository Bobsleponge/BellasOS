import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ service: 'bellasos' });
collectDefaultMetrics({ register: metricsRegistry });

export const httpRequests = new Counter({
  name: 'bellasos_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const eventsPublished = new Counter({
  name: 'bellasos_events_published_total',
  help: 'Total events published to the bus',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

export const moduleActions = new Counter({
  name: 'bellasos_module_actions_total',
  help: 'Total module actions invoked',
  labelNames: ['module', 'action', 'outcome'],
  registers: [metricsRegistry],
});

export const aiRequests = new Counter({
  name: 'bellasos_ai_requests_total',
  help: 'Total AI provider requests',
  labelNames: ['provider', 'model', 'task'],
  registers: [metricsRegistry],
});

export const aiCostUsd = new Counter({
  name: 'bellasos_ai_cost_usd_total',
  help: 'Estimated AI spend in USD',
  labelNames: ['provider', 'model'],
  registers: [metricsRegistry],
});

export const aiLatency = new Histogram({
  name: 'bellasos_ai_latency_ms',
  help: 'AI request latency in ms',
  labelNames: ['provider', 'model'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [metricsRegistry],
});

export async function renderMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}
