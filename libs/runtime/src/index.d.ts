import type { EventBus } from '@bellasos/contracts';
import { AuthService, type AuthMode } from '@bellasos/core-auth';
import { ConfigService } from '@bellasos/core-config';
import { AuditService } from '@bellasos/core-audit';
import { NotificationService } from '@bellasos/core-notifications';
import { ApprovalService, ModuleRegistry } from '@bellasos/core-registry';
import { AIGatewayImpl } from '@bellasos/ai-gateway';
import { MemorySystem } from '@bellasos/memory';
import { RunStore } from '@bellasos/agents-framework';
import { Orchestrator } from '@bellasos/agents-orchestrator';
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
export declare class Platform {
    readonly events: EventBus;
    readonly ai: AIGatewayImpl;
    readonly memory: MemorySystem;
    readonly config: ConfigService;
    readonly audit: AuditService;
    readonly approvals: ApprovalService;
    readonly notifications: NotificationService;
    readonly registry: ModuleRegistry;
    readonly orchestrator: Orchestrator;
    readonly runStore: RunStore;
    readonly auth: AuthService;
    private constructor();
    static create(config?: PlatformConfig): Promise<Platform>;
    health(): {
        status: string;
        db: boolean;
        modules: {
            id: string;
            status: import("@bellasos/contracts").ModuleStatus;
        }[];
        agents: string[];
        timestamp: string;
    };
}
//# sourceMappingURL=index.d.ts.map