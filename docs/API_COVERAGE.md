# BellasOS API Coverage Matrix

Base URL: `http://localhost:4000/api/v1`

## REST Endpoints

| Endpoint | Client method | UI consumer | Notes |
|----------|---------------|-------------|-------|
| GET /health | `api.health` | Taskbar, CommandCenter, SystemHealthWidget | |
| GET /metrics | — | — | Ops only, no UI |
| POST /auth/dev-token | — | — | Deferred until auth UI |
| GET /auth/me | — | — | Dev mode auto-admin |
| GET /modules | `api.modules` | Desktop, CommandCenter, Overview | |
| POST /modules/:id/enable | `api.enableModule` | CommandCenter sidebar, ModulesWidget, IntegrationCard | |
| POST /modules/:id/disable | `api.disableModule` | Same as enable | |
| POST /modules/:id/actions/:action | `api.invoke` | All module panels, ModuleActionsPanel, widgets | |
| GET /widgets | `api.widgets` | ModuleDetailView | |
| GET /agents | `api.agents` | AgentsView | |
| GET /agents/runs | `api.runs` | Overview, AgentsView | |
| POST /agents | `api.createAgent` | AgentsView | |
| DELETE /agents/:name | `api.removeAgent` | AgentsView | |
| POST /agents/command | `api.command` via `useAgentCommand` | AgentsView | 120s timeout |
| GET /ai/models | `api.models` | AiView, AiModelsWidget | |
| GET /ai/providers | `api.providers` | AiView, IntegrationsStrip | |
| POST /ai/discover | `api.discoverModels` | AiView | |
| POST /ai/models | `api.registerModel` | AiView | |
| POST /ai/models/:id/enable | `api.enableModel` | AiView | |
| POST /ai/models/:id/disable | `api.disableModel` | AiView | |
| POST /ai/complete | `api.complete` | AiView | |
| POST /memory/* | — | — | Internal to agents/modules |
| GET /audit | `api.audit` | SecurityView, AuditWidget | |
| GET /notifications | `api.notifications` | SecurityView | Read-only |
| GET /approvals | `api.approvals` | SecurityView | |
| POST /approvals/:id/resolve | `api.resolveApproval` | SecurityView | |
| GET /config/modules/:id/settings | `api.getModuleSettings` | SettingsForm | |
| PUT /config/modules/:id/settings | `api.putModuleSettings` | SettingsForm | |
| PUT /config/ai/providers/:provider/credential | `api.setProviderCredential` | AiView | |
| DELETE /config/ai/providers/:provider/credential | `api.clearProviderCredential` | AiView | |
| GET/PUT /config/ai/routing-strategy | `api.get/setRoutingStrategy` | AiView | Canonical (not llm module settings) |
| POST /config/ai/providers/:provider/test | `api.testProvider` | AiView | Per-provider results |
| GET /integrations | `api.getIntegrations` | SocialPanel, IntegrationsStrip | |
| POST /integrations/social/:platform/connect | `api.connectSocial` | SocialPanel | |
| DELETE /integrations/social/:platform/disconnect | `api.disconnectSocial` | SocialPanel | |
| GET/POST /jarvis/sessions | `api.jarvisSessions/Create` | useJarvisSession, JarvisConsole | |
| GET /jarvis/sessions/:id | `api.jarvisGetSession` | useJarvisSession | |
| POST /jarvis/chat | `api.jarvisChat` | useJarvisSession (Shell + Console) | Unified hook |
| POST /jarvis/transcribe | `api.jarvisTranscribe` | useLocalSpeechInput | |
| POST /jarvis/warmup-stt | `api.jarvisWarmupStt` | VoiceSessionProvider | |
| POST /jarvis/speak | `api.jarvisSpeak` | speechOutput.ts | Primary TTS path |
| GET /ingest/status | `api.ingestStatus` | DataIntelPanel | |
| GET /ingest/recent | `api.ingestRecent` | DataIntelPanel | |
| POST /ingest/collect-all | `api.ingestCollectAll` | DataIntelPanel | |
| POST /ingest/search | `api.ingestSearch` | DataIntelPanel | |
| POST /ingest/feeds/poll | `api.ingestFeedsPoll` | IntelligencePanel | |
| POST /ingest/prices/refresh | `api.ingestPricesRefresh` | — | Use portfolio `prices.refresh` instead |

## Module Actions (via dispatch)

| Module | Action | UI |
|--------|--------|-----|
| portfolio | accounts.list, holdings.*, watchlist.*, summary, analyze, prices.refresh | PortfolioPanel + ModuleActionsPanel |
| research | run, reports.list/delete | ResearchPanel + ModuleActionsPanel |
| intelligence | brief.*, sectors.*, alerts.* | IntelligencePanel + ModuleActionsPanel |
| social | platforms.list, drafts.*, draft.create, schedule, publish, analytics | SocialPanel + ModuleActionsPanel |
| social | scheduled.publishDue | Worker only |
| automation | status, devices.list, device.control | AutomationPanel + ModuleActionsPanel |
| voice | command, speak | VoicePanel + ModuleActionsPanel |
| camera | events.list, ingest | CameraPanel + ModuleActionsPanel |
| llm | usage.summary | AiView usage panel |
| llm | models.list, complete, models.setEnabled | AiView (canonical) / ModuleActionsPanel |

## Navigation

| Entry | Target |
|-------|--------|
| Shell desktop icons | `/console?view=...` via `lib/navigation.ts` |
| Jarvis `openApp` | Same URL routing |
| Command Center sidebar | URL-synced `?view=` |

## Cache Keys

See `apps/web/src/lib/queryKeys.ts` — all mutations use targeted invalidation, not global `invalidateQueries()`.
