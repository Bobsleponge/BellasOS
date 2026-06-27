import { getBellasAuthToken } from './authSession';

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta: { traceId: string; timestamp: string };
}

export interface SettingSpec {
  key: string;
  type: string;
  label: string;
  description?: string;
  default?: unknown;
  secret?: boolean;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

const BASE = API_BASE;

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  const token = await getBellasAuthToken();
  const authHeaders = token ? { authorization: `Bearer ${token}` } : {};
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...authHeaders, ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Cannot reach BellasOS API at ${BASE}. Start the API with "npm run dev:api". (${(err as Error).message})`,
    );
  }
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
  today: (params?: { application?: string; mode?: string; workspaceId?: string }) => {
    const q = new URLSearchParams();
    if (params?.application) q.set('application', params.application);
    if (params?.mode) q.set('mode', params.mode);
    if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
    const qs = q.toString();
    return request<TodayFeed>(`/today${qs ? `?${qs}` : ''}`);
  },
  worldSignals: (params?: { sector?: string; sinceHours?: number }) => {
    const q = new URLSearchParams();
    if (params?.sector) q.set('sector', params.sector);
    if (params?.sinceHours != null) q.set('sinceHours', String(params.sinceHours));
    const qs = q.toString();
    return request<{ count: number; signals: WorldSignalItem[] }>(
      `/world/signals${qs ? `?${qs}` : ''}`,
    );
  },
  worldTrends: () => request<{ trends: WorldTrendItem[] }>('/world/trends'),
  worldCollect: () => request<WorldCollectionResult>('/world/collect', { method: 'POST' }),
  goals: () => request<{ goals: Goal[] }>('/goals'),
  createGoal: (body: Partial<Goal>) =>
    request<{ goal: Goal }>('/goals', { method: 'POST', body: JSON.stringify(body) }),
  initiatives: () => request<{ initiatives: Initiative[] }>('/initiatives'),
  goalProgress: (application?: string) => {
    const qs = application ? `?application=${encodeURIComponent(application)}` : '';
    return request<GoalContext>(`/goals/progress${qs}`);
  },
  decisions: (params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const q = qs.toString();
    return request<{ decisions: Decision[] }>(`/decisions${q ? `?${q}` : ''}`);
  },
  decisionRecommendations: (application?: string) => {
    const qs = application ? `?application=${encodeURIComponent(application)}` : '';
    return request<{ context: DecisionContext }>(`/decisions/recommendations${qs}`);
  },
  commitDecision: (id: string, body: { chosenOptionId: string; rationale?: string }) =>
    request<{ decision: Decision }>(`/decisions/${id}/commit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  workspaces: (params?: { status?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    const qs = q.toString();
    return request<{ workspaces: Workspace[] }>(`/workspaces${qs ? `?${qs}` : ''}`);
  },
  createWorkspace: (body: Partial<Workspace>) =>
    request<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getWorkspace: (id: string, context = false) => {
    const qs = context ? '?context=true' : '';
    return request<{ workspace: Workspace } | WorkspaceContext>(`/workspaces/${id}${qs}`);
  },
  activateWorkspace: (id: string, body: Record<string, unknown> = {}) =>
    request<{ workspace: Workspace; session: FocusSession }>(`/workspaces/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  pauseWorkspace: (id: string) =>
    request<{ workspace: Workspace }>(`/workspaces/${id}/pause`, { method: 'POST' }),
  archiveWorkspace: (id: string) =>
    request<{ workspace: Workspace }>(`/workspaces/${id}/archive`, { method: 'POST' }),
  restoreWorkspace: (id: string) =>
    request<{ workspace: Workspace }>(`/workspaces/${id}/restore`, { method: 'POST' }),
  gatherWorkspace: (id: string) =>
    request<{ workspace: Workspace; added: WorkspaceGatherCounts }>(`/workspaces/${id}/gather`, {
      method: 'POST',
    }),
  activeFocusSession: () => request<{ session: FocusSession | null }>('/sessions/active'),
  memoryRecall: (body: { query: string; tier?: 'short' | 'working' | 'long'; limit?: number }) =>
    request<MemoryHit[]>('/memory/recall', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  memoryRemember: (body: {
    content: string;
    tier?: 'short' | 'working' | 'long';
    tags?: string[];
  }) =>
    request<MemoryItem>('/memory/remember', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  workspaceContext: (id: string) => request<WorkspaceContext>(`/workspaces/${id}?context=true`),
  endFocusSession: (id: string) =>
    request<{ session: FocusSession }>(`/sessions/${id}/end`, { method: 'POST' }),
  artifacts: (params?: { workspaceId?: string; kind?: string }) => {
    const q = new URLSearchParams();
    if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
    if (params?.kind) q.set('kind', params.kind);
    const qs = q.toString();
    return request<{ artifacts: Artifact[] }>(`/artifacts${qs ? `?${qs}` : ''}`);
  },
  jarvisBriefing: (params?: {
    rhythm?: string;
    application?: string;
    mode?: string;
    codingProjectId?: string;
    sessionId?: string;
    deep?: boolean;
    persist?: boolean;
    workspaceId?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.rhythm) q.set('rhythm', params.rhythm);
    if (params?.application) q.set('application', params.application);
    if (params?.mode) q.set('mode', params.mode);
    if (params?.codingProjectId) q.set('codingProjectId', params.codingProjectId);
    if (params?.sessionId) q.set('sessionId', params.sessionId);
    if (params?.workspaceId) q.set('workspaceId', params.workspaceId);
    if (params?.deep) q.set('deep', 'true');
    if (params?.persist) q.set('persist', 'true');
    const qs = q.toString();
    return request<JarvisBriefingResponse>(`/jarvis/briefing${qs ? `?${qs}` : ''}`);
  },
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
    request<T>(
      `/modules/${encodeURIComponent(moduleId)}/actions/${encodeURIComponent(action)}`,
      {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    },
    ),
  command: <T>(
    agentType: string,
    payload: { prompt?: string; taskType?: string; input?: unknown },
    signal?: AbortSignal,
  ) =>
    request<T>('/agents/command', {
      method: 'POST',
      body: JSON.stringify({ agentType, ...payload }),
      signal,
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
    request<{
      ok: boolean;
      error?: string;
      model?: string;
      provider?: string;
      sample?: string;
      version?: unknown;
    }>(
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
  connectPortfolio: (body: { syncUrl: string; appName: string; apiKey?: string }) =>
    request<{
      connected: boolean;
      appName: string;
      syncUrl: string;
      apiKey: string;
      webhookUrl: string;
      exportUrl: string;
    }>('/integrations/portfolio/connect', { method: 'POST', body: JSON.stringify(body) }),
  disconnectPortfolio: () =>
    request<{ disconnected: boolean }>('/integrations/portfolio/disconnect', {
      method: 'DELETE',
    }),
  connectFinanceTracker: (body: { baseUrl?: string; apiKey: string }) =>
    request<{
      connected: boolean;
      baseUrl?: string;
      user?: { email?: string; name?: string };
      error?: string;
    }>('/integrations/finance-tracker/connect', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  disconnectFinanceTracker: () =>
    request<{ disconnected: boolean }>('/integrations/finance-tracker/disconnect', {
      method: 'DELETE',
    }),
  financeTrackerEmbedUrl: (path?: string) => {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<{ url: string; baseUrl: string; nextPath: string }>(
      `/integrations/finance-tracker/embed-url${q}`,
    );
  },
  enableModule: (id: string) =>
    request<{ id: string; status: string }>(`/modules/${encodeURIComponent(id)}/enable`, {
      method: 'POST',
    }),
  disableModule: (id: string) =>
    request<{ id: string; status: string }>(`/modules/${encodeURIComponent(id)}/disable`, {
      method: 'POST',
    }),
  notifications: () => request<NotificationItem[]>('/notifications'),
  jarvisChat: (
    message: string,
    sessionId?: string,
    source?: 'voice' | 'text',
    codingProjectId?: string,
    clientAck?: boolean,
    signal?: AbortSignal,
    application?: string,
    mode?: string,
    workspaceId?: string,
    modeManual?: boolean,
  ) =>
    request<JarvisChatResponse>('/jarvis/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        sessionId,
        source,
        codingProjectId,
        clientAck,
        application,
        mode,
        workspaceId,
        modeManual,
      }),
      signal,
    }),
  jarvisSessions: () =>
    request<{ sessions: JarvisSessionSummary[] }>('/jarvis/sessions'),
  jarvisCreateSession: () =>
    request<{ session: JarvisSessionSummary }>('/jarvis/sessions', {
      method: 'POST',
      body: '{}',
    }),
  jarvisGetSession: (sessionId: string) =>
    request<{ session: JarvisSessionSummary; messages: JarvisMessage[] }>(
      `/jarvis/sessions/${encodeURIComponent(sessionId)}`,
    ),
  jarvisWarmupStt: () =>
    request<{ status: string }>('/jarvis/warmup-stt', { method: 'POST' }),
  jarvisSpeak: (text: string) =>
    request<JarvisSpeakResponse>('/jarvis/speak', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  ingestStatus: () =>
    request<IngestStatusResponse>('/ingest/status'),
  ingestRecent: (limit = 30, sinceHours = 48) =>
    request<IngestRecentResponse>(
      `/ingest/recent?limit=${limit}&sinceHours=${sinceHours}`,
    ),
  ingestCollectAll: () =>
    request<IngestCollectResponse>('/ingest/collect-all', { method: 'POST', body: '{}' }),
  ingestSearch: (query: string, tags?: string[], maxResults?: number) =>
    request<IngestRecentResponse>('/ingest/search', {
      method: 'POST',
      body: JSON.stringify({ query, tags, maxResults }),
    }),
  ingestFeedsPoll: (sectors?: string[]) =>
    request<{ count: number; sectors: string[] }>('/ingest/feeds/poll', {
      method: 'POST',
      body: JSON.stringify({ sectors }),
    }),
  ingestPricesRefresh: (symbols: string[]) =>
    request<IngestRecentResponse>('/ingest/prices/refresh', {
      method: 'POST',
      body: JSON.stringify({ symbols }),
    }),
  jarvisTranscribe: async (audio: Blob, signal?: AbortSignal): Promise<string> => {
    const form = new FormData();
    form.append('audio', audio, 'speech.wav');
    const res = await fetch(`${BASE}/jarvis/transcribe`, {
      method: 'POST',
      body: form,
      signal,
    });
    const json = (await res.json()) as ApiResponse<{ text?: string; error?: string }>;
    if (json.error) throw new Error(json.error.message);
    const data = json.data;
    if (data?.error) throw new Error(data.error);
    return (data?.text ?? '').trim();
  },
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
  source?: 'ui' | 'env' | 'none';
  masked?: string;
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

export type TodayItemKind =
  | 'approval'
  | 'alert'
  | 'intelligence'
  | 'wealth'
  | 'activity'
  | 'priority'
  | 'goal'
  | 'decision'
  | 'world'
  | 'workspace';

export interface TodayItem {
  id: string;
  kind: TodayItemKind;
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  createdAt?: string;
  priority: number;
}

export interface TodayFeed {
  greeting: string;
  contextLine?: string;
  items: TodayItem[];
  connection: { status: 'connected' | 'degraded' | 'offline'; label: string };
  generatedAt: string;
}

export interface JarvisBriefingResponse {
  briefing: {
    rhythm: 'morning' | 'midday' | 'evening' | 'night';
    phase: string;
    greeting: string;
    narrative: string;
    offerDepth: string;
    generatedAt: string;
    strategicInsights?: StrategicInsight[];
    goalProgress?: GoalProgressSummary[];
    decisionRecommendations?: DecisionRecommendation[];
    openDecisions?: DecisionSummary[];
    nextActions?: NextAction[];
    worldPulse?: WorldIntelligenceSummary[];
    worldTrends?: WorldTrendItem[];
    externalHighlights?: WorldSignalItem[];
  };
  todayItems: TodayItem[];
  transcript: string;
  goalProgress?: GoalProgressSummary[];
  strategicInsights?: StrategicInsight[];
  decisionRecommendations?: DecisionRecommendation[];
  openDecisions?: DecisionSummary[];
  nextActions?: NextAction[];
  worldPulse?: WorldIntelligenceSummary[];
  worldTrends?: WorldTrendItem[];
  externalHighlights?: WorldSignalItem[];
  sessionId?: string;
}

export interface WorldTrendItem {
  id: string;
  sector: string;
  direction: 'up' | 'down' | 'flat' | 'volatile';
  docCount: number;
  windowHours: number;
  summary: string;
  confidence: number;
  linkedGoalIds?: string[];
}

export interface WorldIntelligenceSummary {
  id: string;
  headline: string;
  sector: string;
  relevanceLine?: string;
  trendDirection?: string;
}

export interface WorldSignalItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  relevanceLine?: string;
  href?: string;
  worldSignal?: {
    ingestDocId: string;
    sector: string;
    kind: string;
    title: string;
    summary: string;
    fetchedAt: string;
    baseScore: number;
  };
  worldRelevance?: {
    relevanceLine: string;
    audienceLine: string;
    goalIds: string[];
  };
  worldOpportunity?: {
    kind: string;
    title: string;
    summary: string;
    severity: string;
  };
}

export interface WorldCollectionResult {
  total: number;
  bySource: Record<string, number>;
  collectedAt: string;
}

export interface GoalTarget {
  metric: string;
  targetValue: number;
  unit?: string;
  direction: 'increase' | 'decrease' | 'maintain';
}

export interface GoalProgress {
  current?: number;
  baseline?: number;
  pct?: number;
  trend: 'up' | 'down' | 'flat' | 'unknown';
  updatedAt?: string;
}

export interface Goal {
  id: string;
  objective: string;
  target?: GoalTarget;
  category: string;
  domainId: string;
  horizon: string;
  deadlineAt?: string;
  progress: GoalProgress;
  priority: number;
  status: string;
  initiativeId?: string;
  organizationId?: string;
  applicationIds?: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  status: string;
  momentum: string;
  organizationId?: string;
  applicationIds: string[];
  goalIds: string[];
  projectIds?: string[];
  priority: number;
  ownerId: string;
  startedAt?: string;
  targetAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressSummary {
  goalId: string;
  objective: string;
  initiativeName?: string;
  status: string;
  pct?: number;
  trend: string;
  onTrack: boolean;
  headline: string;
}

export interface StrategicInsight {
  id: string;
  kind: string;
  title: string;
  summary: string;
  goalId?: string;
  initiativeId?: string;
  severity: string;
  recommendedAction?: string;
}

export interface GoalContext {
  goals: Goal[];
  initiatives: Initiative[];
  activeGoalIds: string[];
  activeInitiativeIds: string[];
  focusGoalId?: string;
  focusInitiativeId?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact?: string;
  recommended?: boolean;
}

export interface Decision {
  id: string;
  title: string;
  question: string;
  rationale?: string;
  category: string;
  domainId: string;
  status: string;
  priority: number;
  options: DecisionOption[];
  chosenOptionId?: string;
  deadlineAt?: string;
  goalIds: string[];
  initiativeIds: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionRecommendation {
  id: string;
  decisionId?: string;
  signalId?: string;
  title: string;
  question: string;
  recommendedOption: string;
  tradeoffLine: string;
  risks: string[];
  opportunities: string[];
  confidence: { score: number; factors: string[] };
  rationale: string;
  nextAction?: string;
}

export interface DecisionSummary {
  id: string;
  title: string;
  question: string;
  status: string;
  category: string;
  priority: number;
  optionCount: number;
  deadlineAt?: string;
}

export interface NextAction {
  id: string;
  label: string;
  rationale: string;
  confidence: number;
  decisionId?: string;
}

export interface DecisionContext {
  decisions: Decision[];
  openDecisions: Decision[];
  recentOutcomes: unknown[];
  pendingReviews: unknown[];
  focusDecisionId?: string;
}

export interface WorkspaceGatherCounts {
  goals: number;
  initiatives: number;
  decisions: number;
  research: number;
  artifacts: number;
  applications: number;
}

export interface Workspace {
  id: string;
  title: string;
  objective: string;
  type: string;
  status: string;
  domainId: string;
  organizationId?: string;
  applicationIds: string[];
  goalIds: string[];
  initiativeIds: string[];
  decisionIds: string[];
  artifactIds: string[];
  researchIds: string[];
  keywords: string[];
  progressSummary?: string;
  ownerId: string;
  activatedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  workspaceId?: string;
  focusKind: string;
  status: string;
  ownerId: string;
  startedAt: string;
  endedAt?: string;
  jarvisSessionId?: string;
  applicationId?: string;
  summary?: string;
}

export interface Artifact {
  id: string;
  kind: string;
  title: string;
  summary?: string;
  workspaceIds: string[];
  goalIds: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContext {
  workspace: Workspace;
  activeSession?: FocusSession;
  goals: Goal[];
  initiatives: Initiative[];
  openDecisions: DecisionSummary[];
  artifacts: Artifact[];
}

export interface WorkspaceProgressSummary {
  workspaceId: string;
  title: string;
  objective: string;
  status: string;
  headline: string;
  onTrack: boolean;
  linkedGoalCount: number;
  openDecisionCount: number;
  artifactCount: number;
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
  sessionId?: string;
  routedTo?: { kind: 'agent' | 'module'; id: string };
  openApp?: string;
  suggestedApp?: string;
  codingProjectId?: string;
  workspaceId?: string;
  focusSessionId?: string;
  operatingMode?: string;
  modeSwitched?: boolean;
  modeSwitchReason?: string;
  action?: { moduleId: string; action: string; input?: unknown };
  dataAsOf?: string;
  sources?: Array<{ url?: string; title: string; fetchedAt: string; source?: string }>;
}

export type JarvisSpeakResponse =
  | {
      available: true;
      audioBase64: string;
      mimeType: string;
      provider: 'openai' | 'elevenlabs';
      voice: string;
    }
  | {
      available: false;
      reason: string;
    };

export interface JarvisSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
}

export interface JarvisMessage {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  createdAt: string;
}

export interface IngestConnectorStatus {
  id: string;
  name: string;
  enabled: boolean;
  requiresKey: boolean;
  configured: boolean;
  description: string;
}

export interface IngestStatusResponse {
  connectors: IngestConnectorStatus[];
  lastCollectionAt: string | null;
}

export interface IngestDocumentSummary {
  id: string;
  source: string;
  title: string;
  url?: string;
  snippet: string;
  tags: string[];
  fetchedAt: string;
}

export interface IngestRecentResponse {
  count: number;
  documents: IngestDocumentSummary[];
}

export interface IngestCollectResponse {
  total: number;
  bySource: Record<string, number>;
  collectedAt: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  tier: 'short' | 'working' | 'long';
  tags: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHit {
  item: MemoryItem;
  score: number;
}
