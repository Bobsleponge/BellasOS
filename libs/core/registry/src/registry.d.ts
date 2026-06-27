import { type AIGateway, type CallContext, type EventBus, type MemoryGateway, type ModuleCaller, type ModuleManifest, type ModuleRuntime, type ModuleStatus, type WidgetSpec } from '@bellasos/contracts';
import type { ConfigService } from '@bellasos/core-config';
import type { AuditService } from '@bellasos/core-audit';
import { ApprovalService } from './approvals';
export interface RegistryDeps {
    events: EventBus;
    ai: AIGateway;
    memory: MemoryGateway;
    config: ConfigService;
    audit: AuditService;
    approvals: ApprovalService;
}
/**
 * The Module Registry discovers, validates, installs, enables, disables and
 * dispatches to modules. Modules communicate only through the Module API
 * (this registry) and the event bus, never via direct code imports.
 */
export declare class ModuleRegistry implements ModuleCaller {
    private readonly deps;
    private readonly modules;
    constructor(deps: RegistryDeps);
    /** Register a module runtime and build its long-lived context. */
    register(runtime: ModuleRuntime): Promise<void>;
    /** Run install + enable lifecycle respecting persisted disabled state. */
    bootstrap(): Promise<void>;
    /** @deprecated use bootstrap() */
    startAll(): Promise<void>;
    install(id: string): Promise<void>;
    enable(id: string): Promise<void>;
    disable(id: string): Promise<void>;
    uninstall(id: string): Promise<void>;
    /** ModuleCaller: invoke an action on a module (permission + approval gated). */
    call<T = unknown>(moduleId: string, action: string, input: unknown, ctx?: Partial<CallContext>): Promise<T>;
    dispatch<T = unknown>(moduleId: string, action: string, input: unknown, ctx: CallContext, options?: {
        skipApproval?: boolean;
    }): Promise<T>;
    list(): Array<{
        manifest: ModuleManifest;
        status: ModuleStatus;
    }>;
    widgets(): Array<WidgetSpec & {
        moduleId: string;
    }>;
    private validateInput;
    private require;
    private assertCompatible;
    private persist;
}
//# sourceMappingURL=registry.d.ts.map