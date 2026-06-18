import type { EventBus } from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { initDb, isDbAvailable } from '@bellasos/db';
import { createEventBus } from '@bellasos/core-events';
import { AuthService, type AuthMode } from '@bellasos/core-auth';
import { ConfigService } from '@bellasos/core-config';
import { AuditService } from '@bellasos/core-audit';
import { NotificationService } from '@bellasos/core-notifications';
import { ApprovalService, ModuleRegistry } from '@bellasos/core-registry';
import { AIGatewayImpl } from '@bellasos/ai-gateway';
import { MemorySystem } from '@bellasos/memory';
import { RunStore, type AgentDeps } from '@bellasos/agents-framework';
import { Orchestrator } from '@bellasos/agents-orchestrator';
import {
  MemoryAgent,
  ResearchAgent,
  IntelligenceAgent,
  PortfolioAgent,
  AutomationAgent,
  SocialAgent,
  CodingAgent,
  OperationsAgent,
  GenericAgent,
} from '@bellasos/agents-pool';
import { createLlmModule } from '@bellasos/module-llm';
import { createResearchModule } from '@bellasos/module-research';
import { createIntelligenceModule } from '@bellasos/module-intelligence';
import { createPortfolioModule } from '@bellasos/module-portfolio';
import { createSocialModule } from '@bellasos/module-social';
import { createAutomationModule } from '@bellasos/module-automation';
import { createVoiceModule } from '@bellasos/module-voice';
import { createCameraModule } from '@bellasos/module-camera';
import { getIngestionService } from '@bellasos/core-ingestion';

const log = createLogger({ lib: 'runtime' });

export interface PlatformConfig {
  databaseUrl?: string;
  natsUrl?: string;
  redisUrl?: string;
  authMode?: AuthMode;
  jwtSecret?: string;
  keycloakIssuerUrl?: string;
  source?: string;
}

/**
 * The composition root. Wires every layer (core, AI, memory, agents, modules)
 * into a single Platform instance shared by the API host and the worker.
 * Everything degrades gracefully if infrastructure is missing.
 */
export class Platform {
  private constructor(
    readonly events: EventBus,
    readonly ai: AIGatewayImpl,
    readonly memory: MemorySystem,
    readonly config: ConfigService,
    readonly audit: AuditService,
    readonly approvals: ApprovalService,
    readonly notifications: NotificationService,
    readonly registry: ModuleRegistry,
    readonly orchestrator: Orchestrator,
    readonly runStore: RunStore,
    readonly auth: AuthService,
  ) {}

  static async create(config: PlatformConfig = {}): Promise<Platform> {
    await initDb({
      connectionString:
        config.databaseUrl ??
        process.env.DATABASE_URL ??
        'postgres://bellasos:bellasos@localhost:5432/bellasos',
    });

    getIngestionService();

    const events = await createEventBus({
      natsUrl: config.natsUrl ?? process.env.NATS_URL,
      source: config.source ?? 'bellasos',
    });

    const cfg = new ConfigService();
    const audit = new AuditService();
    const approvals = new ApprovalService(events);
    const notifications = new NotificationService(events);

    const ai = new AIGatewayImpl({ config: cfg });
    await ai.init();

    const memory = new MemorySystem({
      ai,
      redisUrl: config.redisUrl ?? process.env.REDIS_URL,
    });

    const registry = new ModuleRegistry({
      events,
      ai,
      memory,
      config: cfg,
      audit,
      approvals,
    });

    for (const create of [
      createLlmModule,
      createResearchModule,
      createIntelligenceModule,
      createPortfolioModule,
      createSocialModule,
      createAutomationModule,
      createVoiceModule,
      createCameraModule,
    ]) {
      await registry.register(create());
    }
    await registry.bootstrap();

    const runStore = new RunStore();
    const agentDeps: AgentDeps = {
      ai,
      memory,
      events,
      logger: createLogger({ lib: 'agents' }),
      runStore,
    };
    const orchestrator = new Orchestrator({
      events,
      runStore,
      createGenericAgent: (cfg) => new GenericAgent(agentDeps, cfg),
    });
    for (const Agent of [
      MemoryAgent,
      ResearchAgent,
      IntelligenceAgent,
      PortfolioAgent,
      AutomationAgent,
      SocialAgent,
      CodingAgent,
      OperationsAgent,
    ]) {
      orchestrator.register(new Agent(agentDeps));
    }
    await orchestrator.loadPersisted();
    await orchestrator.start();

    const auth = new AuthService({
      mode: config.authMode ?? (process.env.AUTH_MODE as AuthMode) ?? 'dev',
      jwtSecret: config.jwtSecret ?? process.env.AUTH_JWT_SECRET ?? 'dev-secret',
      keycloakIssuerUrl:
        config.keycloakIssuerUrl ?? process.env.KEYCLOAK_ISSUER_URL,
    });

    log.info('Platform ready', {
      db: isDbAvailable(),
      modules: registry.list().length,
      agents: orchestrator.listAgents().length,
    });

    return new Platform(
      events,
      ai,
      memory,
      cfg,
      audit,
      approvals,
      notifications,
      registry,
      orchestrator,
      runStore,
      auth,
    );
  }

  health() {
    return {
      status: 'ok',
      db: isDbAvailable(),
      modules: this.registry.list().map((m) => ({
        id: m.manifest.id,
        status: m.status,
      })),
      agents: this.orchestrator.listAgents(),
      timestamp: new Date().toISOString(),
    };
  }
}
