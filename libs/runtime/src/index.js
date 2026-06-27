"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = void 0;
const observability_1 = require("@bellasos/observability");
const db_1 = require("@bellasos/db");
const core_events_1 = require("@bellasos/core-events");
const core_auth_1 = require("@bellasos/core-auth");
const core_config_1 = require("@bellasos/core-config");
const core_audit_1 = require("@bellasos/core-audit");
const core_notifications_1 = require("@bellasos/core-notifications");
const core_registry_1 = require("@bellasos/core-registry");
const ai_gateway_1 = require("@bellasos/ai-gateway");
const memory_1 = require("@bellasos/memory");
const agents_framework_1 = require("@bellasos/agents-framework");
const contracts_1 = require("@bellasos/contracts");
const agents_orchestrator_1 = require("@bellasos/agents-orchestrator");
const agents_pool_1 = require("@bellasos/agents-pool");
const module_llm_1 = require("@bellasos/module-llm");
const module_research_1 = require("@bellasos/module-research");
const module_intelligence_1 = require("@bellasos/module-intelligence");
const module_portfolio_1 = require("@bellasos/module-portfolio");
const module_social_1 = require("@bellasos/module-social");
const module_automation_1 = require("@bellasos/module-automation");
const module_voice_1 = require("@bellasos/module-voice");
const module_camera_1 = require("@bellasos/module-camera");
const module_coding_1 = require("@bellasos/module-coding");
const module_finance_1 = require("@bellasos/module-finance");
const module_finance_tracker_1 = require("@bellasos/module-finance-tracker");
const core_ingestion_1 = require("@bellasos/core-ingestion");
const log = (0, observability_1.createLogger)({ lib: 'runtime' });
/**
 * The composition root. Wires every layer (core, AI, memory, agents, modules)
 * into a single Platform instance shared by the API host and the worker.
 * Everything degrades gracefully if infrastructure is missing.
 */
class Platform {
    events;
    ai;
    memory;
    config;
    audit;
    approvals;
    notifications;
    registry;
    orchestrator;
    runStore;
    auth;
    constructor(events, ai, memory, config, audit, approvals, notifications, registry, orchestrator, runStore, auth) {
        this.events = events;
        this.ai = ai;
        this.memory = memory;
        this.config = config;
        this.audit = audit;
        this.approvals = approvals;
        this.notifications = notifications;
        this.registry = registry;
        this.orchestrator = orchestrator;
        this.runStore = runStore;
        this.auth = auth;
    }
    static async create(config = {}) {
        await (0, db_1.initDb)({
            connectionString: config.databaseUrl ??
                process.env.DATABASE_URL ??
                'postgres://bellasos:bellasos@localhost:5432/bellasos',
        });
        (0, core_ingestion_1.getIngestionService)();
        const events = await (0, core_events_1.createEventBus)({
            natsUrl: config.natsUrl ?? process.env.NATS_URL,
            source: config.source ?? 'bellasos',
        });
        const cfg = new core_config_1.ConfigService();
        const audit = new core_audit_1.AuditService();
        const approvals = new core_registry_1.ApprovalService(events);
        const notifications = new core_notifications_1.NotificationService(events);
        const ai = new ai_gateway_1.AIGatewayImpl({ config: cfg });
        await ai.init();
        const memory = new memory_1.MemorySystem({
            ai,
            redisUrl: config.redisUrl ?? process.env.REDIS_URL,
        });
        const registry = new core_registry_1.ModuleRegistry({
            events,
            ai,
            memory,
            config: cfg,
            audit,
            approvals,
        });
        for (const create of [
            module_llm_1.createLlmModule,
            module_research_1.createResearchModule,
            module_intelligence_1.createIntelligenceModule,
            module_portfolio_1.createPortfolioModule,
            module_social_1.createSocialModule,
            module_automation_1.createAutomationModule,
            module_voice_1.createVoiceModule,
            module_camera_1.createCameraModule,
            module_coding_1.createCodingModule,
            module_finance_1.createFinanceModule,
            module_finance_tracker_1.createFinanceTrackerModule,
        ]) {
            await registry.register(create());
        }
        await registry.bootstrap();
        const runStore = new agents_framework_1.RunStore();
        const modulesGateway = {
            invoke: (moduleId, action, input, task) => registry.dispatch(moduleId, action, input, {
                principal: task.actorId
                    ? {
                        id: task.actorId,
                        type: 'user',
                        roles: ['admin'],
                        permissions: ['*'],
                    }
                    : contracts_1.SYSTEM_PRINCIPAL,
                traceId: task.traceId,
            }),
        };
        const agentDeps = {
            ai,
            memory,
            events,
            logger: (0, observability_1.createLogger)({ lib: 'agents' }),
            runStore,
            modules: modulesGateway,
        };
        const orchestrator = new agents_orchestrator_1.Orchestrator({
            events,
            runStore,
            createGenericAgent: (cfg) => new agents_pool_1.GenericAgent(agentDeps, cfg),
        });
        for (const Agent of [
            agents_pool_1.MemoryAgent,
            agents_pool_1.ResearchAgent,
            agents_pool_1.IntelligenceAgent,
            agents_pool_1.PortfolioAgent,
            agents_pool_1.FinanceAgent,
            agents_pool_1.AutomationAgent,
            agents_pool_1.SocialAgent,
            agents_pool_1.CodingAgent,
            agents_pool_1.OperationsAgent,
        ]) {
            orchestrator.register(new Agent(agentDeps));
        }
        await orchestrator.loadPersisted();
        await orchestrator.start();
        const auth = new core_auth_1.AuthService({
            mode: config.authMode ?? process.env.AUTH_MODE ?? 'dev',
            jwtSecret: config.jwtSecret ?? process.env.AUTH_JWT_SECRET ?? 'dev-secret',
            keycloakIssuerUrl: config.keycloakIssuerUrl ?? process.env.KEYCLOAK_ISSUER_URL,
        });
        log.info('Platform ready', {
            db: (0, db_1.isDbAvailable)(),
            modules: registry.list().length,
            agents: orchestrator.listAgents().length,
        });
        return new Platform(events, ai, memory, cfg, audit, approvals, notifications, registry, orchestrator, runStore, auth);
    }
    health() {
        return {
            status: 'ok',
            db: (0, db_1.isDbAvailable)(),
            modules: this.registry.list().map((m) => ({
                id: m.manifest.id,
                status: m.status,
            })),
            agents: this.orchestrator.listAgents(),
            timestamp: new Date().toISOString(),
        };
    }
}
exports.Platform = Platform;
//# sourceMappingURL=index.js.map