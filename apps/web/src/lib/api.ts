const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: { traceId: string; timestamp: string };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data as T;
}

export const api = {
  health: () => request<Health>('/health'),
  widgets: () => request<WidgetSpec[]>('/widgets'),
  modules: () => request<ModuleSummary[]>('/modules'),
  agents: () => request<AgentInfo[]>('/agents'),
  createAgent: (a: { name: string; role: string; taskType?: string }) =>
    request<AgentInfo>('/agents', { method: 'POST', body: JSON.stringify(a) }),
  removeAgent: (name: string) =>
    request<{ removed: boolean }>(`/agents/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  runs: () => request<AgentRun[]>('/agents/runs'),
  audit: () => request<AuditEntry[]>('/audit'),
  approvals: () => request<Approval[]>('/approvals'),
  resolveApproval: (id: string, decision: 'approved' | 'rejected', reason?: string) =>
    request<unknown>(`/approvals/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),
  models: () => request<ModelDescriptor[]>('/ai/models'),
  providers: () => request<ProviderStatus[]>('/ai/providers'),
  discoverModels: () =>
    request<ModelDescriptor[]>('/ai/discover', { method: 'POST' }),
  enableModel: (id: string) =>
    request<ModelDescriptor[]>(`/ai/models/${encodeURIComponent(id)}/enable`, {
      method: 'POST',
    }),
  disableModel: (id: string) =>
    request<ModelDescriptor[]>(`/ai/models/${encodeURIComponent(id)}/disable`, {
      method: 'POST',
    }),
  registerModel: (model: NewModel) =>
    request<ModelDescriptor[]>('/ai/models', {
      method: 'POST',
      body: JSON.stringify(model),
    }),
  invoke: <T>(moduleId: string, action: string, input: unknown) =>
    request<T>(`/modules/${moduleId}/actions/${action}`, {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    }),
  command: <T>(
    agentType: string,
    payload: { prompt?: string; taskType?: string; input?: unknown },
  ) =>
    request<T>('/agents/command', {
      method: 'POST',
      body: JSON.stringify({ agentType, ...payload }),
    }),
  complete: (prompt: string, model?: string) =>
    request<{ text: string; model: string; provider: string }>(
      '/ai/complete',
      { method: 'POST', body: JSON.stringify({ prompt, model }) },
    ),
  getModuleSettings: (moduleId: string) =>
    request<ModuleSettingsResponse>(`/config/modules/${encodeURIComponent(moduleId)}/settings`),
  putModuleSettings: (
    moduleId: string,
    data: { values?: Record<string, unknown>; secrets?: Record<string, string> },
  ) =>
    request<{ saved: boolean }>(`/config/modules/${encodeURIComponent(moduleId)}/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  setProviderCredential: (provider: string, value: string) =>
    request<{ saved: boolean }>(
      `/config/ai/providers/${encodeURIComponent(provider)}/credential`,
      { method: 'PUT', body: JSON.stringify({ value }) },
    ),
  clearProviderCredential: (provider: string) =>
    request<{ cleared: boolean }>(
      `/config/ai/providers/${encodeURIComponent(provider)}/credential`,
      { method: 'DELETE' },
    ),
  getRoutingStrategy: () =>
    request<{ strategy: string }>('/config/ai/routing-strategy'),
  setRoutingStrategy: (strategy: string) =>
    request<{ strategy: string }>('/config/ai/routing-strategy', {
      method: 'PUT',
      body: JSON.stringify({ strategy }),
    }),
  testProvider: (provider: string) =>
    request<{ ok: boolean; error?: string; model?: string; sample?: string; version?: unknown }>(
      `/config/ai/providers/${encodeURIComponent(provider)}/test`,
      { method: 'POST' },
    ),
  getIntegrations: () => request<IntegrationsResponse>('/integrations'),
  connectSocial: (
    platform: string,
    body: { accessToken: string; accountName?: string; refreshToken?: string },
  ) =>
    request<{ connected: boolean }>(
      `/integrations/social/${encodeURIComponent(platform)}/connect`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  disconnectSocial: (platform: string) =>
    request<{ disconnected: boolean }>(
      `/integrations/social/${encodeURIComponent(platform)}/disconnect`,
      { method: 'DELETE' },
    ),
  enableModule: (id: string) =>
    request<{ id: string; status: string }>(`/modules/${encodeURIComponent(id)}/enable`, {
      method: 'POST',
    }),
  disableModule: (id: string) =>
    request<{ id: string; status: string }>(`/modules/${encodeURIComponent(id)}/disable`, {
      method: 'POST',
    }),
  notifications: () => request<NotificationItem[]>('/notifications'),
  jarvisChat: (message: string, sessionId?: string) =>
    request<JarvisChatResponse>('/jarvis/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
  jarvisWarmupStt: () =>
    request<{ status: string }>('/jarvis/warmup-stt', { method: 'POST' }),
};

export interface Health {
  status: string;
  db: boolean;
  modules: Array<{ id: string; status: string }>;
  agents: string[];
  timestamp: string;
}

export interface WidgetSpec {
  id: string;
  title: string;
  component: string;
  defaultSize: 'sm' | 'md' | 'lg' | 'xl';
  moduleId: string;
  dataAction?: string;
}

export interface ModuleSummary {
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    actions: Array<{ name: string; description: string; permission: string }>;
  };
  status: string;
}

export interface AgentInfo {
  name: string;
  type: string;
  dynamic: boolean;
  role?: string;
}

export interface AgentRun {
  id: string;
  agentType: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  outcome: string;
  actorId?: string | null;
  createdAt: string;
}

export interface Approval {
  id: string;
  moduleId: string;
  action: string;
  status: string;
  requestedBy?: string | null;
  createdAt: string;
  input?: unknown;
}

export interface ModelDescriptor {
  id: string;
  provider: string;
  displayName: string;
  capabilities: string[];
  contextWindow: number;
  local: boolean;
  enabled: boolean;
  cost: { inputPerMTokensUsd: number; outputPerMTokensUsd: number };
}

export interface ProviderStatus {
  provider: string;
  configured: boolean;
}

export interface SettingSpec {
  key: string;
  type: string;
  label: string;
  description?: string;
  default?: unknown;
  secret?: boolean;
}

export interface ModuleSettingsResponse {
  moduleId: string;
  settings: SettingSpec[];
  values: Record<string, unknown>;
  maskedSecrets: Record<string, string | undefined>;
}

export interface IntegrationsResponse {
  modules: Array<{
    moduleId: string;
    name: string;
    status: string;
    credentials: Record<string, boolean>;
    linkedAccounts: Array<{ platform: string; accountName: string | null; status: string }>;
  }>;
  providers: ProviderStatus[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NewModel {
  id: string;
  provider: string;
  displayName: string;
  capabilities: string[];
  contextWindow: number;
  local: boolean;
  enabled: boolean;
  cost: { inputPerMTokensUsd: number; outputPerMTokensUsd: number };
}

export interface JarvisChatResponse {
  reply: string;
  state: 'completed' | 'needs_approval' | 'error';
  routedTo?: { kind: 'agent' | 'module'; id: string };
  openApp?: string;
  action?: { moduleId: string; action: string; input?: unknown };
  dataAsOf?: string;
  sources?: Array<{ url?: string; title: string; fetchedAt: string }>;
}
