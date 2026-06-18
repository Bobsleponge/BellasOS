import {
  BellasError,
  ErrorCode,
  CoreEvents,
  HOST_API_VERSION,
  SYSTEM_PRINCIPAL,
  hasPermission,
  type AIGateway,
  type ActionSpec,
  type CallContext,
  type EventBus,
  type MemoryGateway,
  type ModuleCaller,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
  type ModuleStatus,
  type WidgetSpec,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';
import { moduleActions } from '@bellasos/observability';
import type { ConfigService } from '@bellasos/core-config';
import type { AuditService } from '@bellasos/core-audit';
import { ModuleScopedDb } from './scoped-db';
import { ApprovalService } from './approvals';

const log = createLogger({ lib: 'registry' });

export interface RegistryDeps {
  events: EventBus;
  ai: AIGateway;
  memory: MemoryGateway;
  config: ConfigService;
  audit: AuditService;
  approvals: ApprovalService;
}

interface RegisteredModule {
  runtime: ModuleRuntime;
  context: ModuleContext;
  status: ModuleStatus;
}

/**
 * The Module Registry discovers, validates, installs, enables, disables and
 * dispatches to modules. Modules communicate only through the Module API
 * (this registry) and the event bus, never via direct code imports.
 */
export class ModuleRegistry implements ModuleCaller {
  private readonly modules = new Map<string, RegisteredModule>();

  constructor(private readonly deps: RegistryDeps) {}

  /** Register a module runtime and build its long-lived context. */
  async register(runtime: ModuleRuntime): Promise<void> {
    const { manifest } = runtime;
    this.assertCompatible(manifest);
    if (this.modules.has(manifest.id)) {
      throw new BellasError(
        ErrorCode.Conflict,
        `Module already registered: ${manifest.id}`,
      );
    }

    const context: ModuleContext = {
      moduleId: manifest.id,
      events: this.deps.events,
      call: this,
      config: this.deps.config.scope(`module:${manifest.id}`),
      logger: createLogger({ module: manifest.id }),
      ai: this.deps.ai,
      memory: this.deps.memory,
      storage: new ModuleScopedDb(manifest.id),
    };

    this.modules.set(manifest.id, { runtime, context, status: 'registered' });
    await this.persist(manifest, 'registered');
    log.info('Module registered', { id: manifest.id, version: manifest.version });
  }

  /** Run install + enable lifecycle respecting persisted disabled state. */
  async bootstrap(): Promise<void> {
    const disabled = new Set<string>();
    if (isDbAvailable()) {
      try {
        const rows = await getDb()
          .selectFrom('core.modules')
          .select(['id', 'status'])
          .execute();
        for (const r of rows) {
          if (r.status === 'disabled') disabled.add(r.id);
        }
      } catch (err) {
        log.warn('module restore failed', { error: (err as Error).message });
      }
    }
    for (const id of this.modules.keys()) {
      await this.install(id);
      if (disabled.has(id)) {
        this.require(id).status = 'disabled';
      } else {
        await this.enable(id);
      }
    }
  }

  /** @deprecated use bootstrap() */
  async startAll(): Promise<void> {
    await this.bootstrap();
  }

  async install(id: string): Promise<void> {
    const mod = this.require(id);
    if (mod.status !== 'registered' && mod.status !== 'error') return;
    await mod.runtime.onInstall(mod.context);
    mod.status = 'installed';
    await this.persist(mod.runtime.manifest, 'installed');
    await this.deps.events.publish(CoreEvents.ModuleInstalled, { id });
  }

  async enable(id: string): Promise<void> {
    const mod = this.require(id);
    if (mod.status === 'enabled') return;
    await mod.runtime.onEnable(mod.context);
    mod.status = 'enabled';
    await this.persist(mod.runtime.manifest, 'enabled');
    await this.deps.events.publish(CoreEvents.ModuleEnabled, { id });
    log.info('Module enabled', { id });
  }

  async disable(id: string): Promise<void> {
    const mod = this.require(id);
    if (mod.status !== 'enabled') return;
    await mod.runtime.onDisable(mod.context);
    mod.status = 'disabled';
    await this.persist(mod.runtime.manifest, 'disabled');
    await this.deps.events.publish(CoreEvents.ModuleDisabled, { id });
    log.info('Module disabled', { id });
  }

  async uninstall(id: string): Promise<void> {
    const mod = this.require(id);
    if (mod.status === 'enabled') await this.disable(id);
    await mod.runtime.onUninstall(mod.context);
    this.modules.delete(id);
    if (isDbAvailable()) {
      await getDb().deleteFrom('core.modules').where('id', '=', id).execute();
    }
    await this.deps.events.publish(CoreEvents.ModuleUninstalled, { id });
  }

  /** ModuleCaller: invoke an action on a module (permission + approval gated). */
  async call<T = unknown>(
    moduleId: string,
    action: string,
    input: unknown,
    ctx?: Partial<CallContext>,
  ): Promise<T> {
    const callContext: CallContext = {
      principal: ctx?.principal ?? SYSTEM_PRINCIPAL,
      traceId: ctx?.traceId ?? crypto.randomUUID(),
      idempotencyKey: ctx?.idempotencyKey,
    };
    return this.dispatch<T>(moduleId, action, input, callContext);
  }

  async dispatch<T = unknown>(
    moduleId: string,
    action: string,
    input: unknown,
    ctx: CallContext,
    options: { skipApproval?: boolean } = {},
  ): Promise<T> {
    const mod = this.modules.get(moduleId);
    if (!mod) {
      throw new BellasError(
        ErrorCode.ModuleNotFound,
        `Module not found: ${moduleId}`,
      );
    }
    if (mod.status !== 'enabled') {
      throw new BellasError(
        ErrorCode.ModuleDisabled,
        `Module disabled: ${moduleId}`,
      );
    }

    const spec = mod.runtime.manifest.actions.find((a) => a.name === action);
    if (!spec) {
      throw new BellasError(
        ErrorCode.ActionNotFound,
        `Action not found: ${moduleId}/${action}`,
      );
    }

    if (!hasPermission(ctx.principal, spec.permission)) {
      await this.deps.audit.record({
        actorId: ctx.principal.id,
        action: `${moduleId}.${action}`,
        outcome: 'denied',
        traceId: ctx.traceId,
        metadata: { required: spec.permission },
      });
      moduleActions.inc({ module: moduleId, action, outcome: 'denied' });
      throw new BellasError(
        ErrorCode.AuthzDenied,
        `Permission denied: requires ${spec.permission}`,
      );
    }

    const validInput = this.validateInput(spec, input);

    if (spec.requiresApproval && !options.skipApproval) {
      const approval = await this.deps.approvals.request({
        actorId: ctx.principal.id,
        moduleId,
        action,
        input: validInput as Record<string, unknown>,
        traceId: ctx.traceId,
      });
      throw new BellasError(
        ErrorCode.ApprovalRequired,
        `Action requires approval: ${approval.id}`,
        { approvalId: approval.id },
      );
    }

    try {
      const result = await mod.runtime.handle(action, validInput, ctx);
      await this.deps.audit.record({
        actorId: ctx.principal.id,
        action: `${moduleId}.${action}`,
        outcome: 'ok',
        traceId: ctx.traceId,
      });
      moduleActions.inc({ module: moduleId, action, outcome: 'ok' });
      return (spec.outputSchema?.parse(result) ?? result) as T;
    } catch (err) {
      await this.deps.audit.record({
        actorId: ctx.principal.id,
        action: `${moduleId}.${action}`,
        outcome: 'error',
        traceId: ctx.traceId,
        metadata: { error: (err as Error).message },
      });
      moduleActions.inc({ module: moduleId, action, outcome: 'error' });
      throw err;
    }
  }

  list(): Array<{ manifest: ModuleManifest; status: ModuleStatus }> {
    return [...this.modules.values()].map((m) => ({
      manifest: m.runtime.manifest,
      status: m.status,
    }));
  }

  widgets(): Array<WidgetSpec & { moduleId: string }> {
    const result: Array<WidgetSpec & { moduleId: string }> = [];
    for (const mod of this.modules.values()) {
      if (mod.status !== 'enabled') continue;
      for (const w of mod.runtime.manifest.widgets ?? []) {
        result.push({ ...w, moduleId: mod.runtime.manifest.id });
      }
    }
    return result;
  }

  private validateInput(spec: ActionSpec, input: unknown): unknown {
    if (!spec.inputSchema) return input;
    const parsed = spec.inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BellasError(
        ErrorCode.ValidationFailed,
        'Invalid action input',
        parsed.error.flatten(),
      );
    }
    return parsed.data;
  }

  private require(id: string): RegisteredModule {
    const mod = this.modules.get(id);
    if (!mod) {
      throw new BellasError(ErrorCode.ModuleNotFound, `Module not found: ${id}`);
    }
    return mod;
  }

  private assertCompatible(manifest: ModuleManifest): void {
    const [hostMajor] = HOST_API_VERSION.split('.');
    const [modMajor] = manifest.apiVersion.split('.');
    if (hostMajor !== modMajor) {
      throw new BellasError(
        ErrorCode.Conflict,
        `Module ${manifest.id} requires API ${manifest.apiVersion}, host is ${HOST_API_VERSION}`,
      );
    }
  }

  private async persist(
    manifest: ModuleManifest,
    status: ModuleStatus,
  ): Promise<void> {
    if (!isDbAvailable()) return;
    try {
      await getDb()
        .insertInto('core.modules')
        .values({
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          status,
          manifest: manifest as unknown as Record<string, unknown>,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            status,
            version: manifest.version,
            manifest: manifest as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          }),
        )
        .execute();
    } catch (err) {
      log.error('module persist failed', { error: (err as Error).message });
    }
  }
}
