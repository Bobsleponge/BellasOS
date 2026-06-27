"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleRegistry = void 0;
const contracts_1 = require("@bellasos/contracts");
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const observability_2 = require("@bellasos/observability");
const scoped_db_1 = require("./scoped-db");
const log = (0, observability_1.createLogger)({ lib: 'registry' });
/**
 * The Module Registry discovers, validates, installs, enables, disables and
 * dispatches to modules. Modules communicate only through the Module API
 * (this registry) and the event bus, never via direct code imports.
 */
class ModuleRegistry {
    deps;
    modules = new Map();
    constructor(deps) {
        this.deps = deps;
    }
    /** Register a module runtime and build its long-lived context. */
    async register(runtime) {
        const { manifest } = runtime;
        this.assertCompatible(manifest);
        if (this.modules.has(manifest.id)) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.Conflict, `Module already registered: ${manifest.id}`);
        }
        const context = {
            moduleId: manifest.id,
            events: this.deps.events,
            call: this,
            config: this.deps.config.scope(`module:${manifest.id}`),
            logger: (0, observability_1.createLogger)({ module: manifest.id }),
            ai: this.deps.ai,
            memory: this.deps.memory,
            storage: new scoped_db_1.ModuleScopedDb(manifest.id),
        };
        this.modules.set(manifest.id, { runtime, context, status: 'registered' });
        await this.persist(manifest, 'registered');
        log.info('Module registered', { id: manifest.id, version: manifest.version });
    }
    /** Run install + enable lifecycle respecting persisted disabled state. */
    async bootstrap() {
        const disabled = new Set();
        if ((0, db_1.isDbAvailable)()) {
            try {
                const rows = await (0, db_1.getDb)()
                    .selectFrom('core.modules')
                    .select(['id', 'status'])
                    .execute();
                for (const r of rows) {
                    if (r.status === 'disabled')
                        disabled.add(r.id);
                }
            }
            catch (err) {
                log.warn('module restore failed', { error: err.message });
            }
        }
        for (const id of this.modules.keys()) {
            await this.install(id);
            if (disabled.has(id)) {
                this.require(id).status = 'disabled';
            }
            else {
                await this.enable(id);
            }
        }
    }
    /** @deprecated use bootstrap() */
    async startAll() {
        await this.bootstrap();
    }
    async install(id) {
        const mod = this.require(id);
        if (mod.status !== 'registered' && mod.status !== 'error')
            return;
        await mod.runtime.onInstall(mod.context);
        mod.status = 'installed';
        await this.persist(mod.runtime.manifest, 'installed');
        await this.deps.events.publish(contracts_1.CoreEvents.ModuleInstalled, { id });
    }
    async enable(id) {
        const mod = this.require(id);
        if (mod.status === 'enabled')
            return;
        await mod.runtime.onEnable(mod.context);
        mod.status = 'enabled';
        await this.persist(mod.runtime.manifest, 'enabled');
        await this.deps.events.publish(contracts_1.CoreEvents.ModuleEnabled, { id });
        log.info('Module enabled', { id });
    }
    async disable(id) {
        const mod = this.require(id);
        if (mod.status !== 'enabled')
            return;
        await mod.runtime.onDisable(mod.context);
        mod.status = 'disabled';
        await this.persist(mod.runtime.manifest, 'disabled');
        await this.deps.events.publish(contracts_1.CoreEvents.ModuleDisabled, { id });
        log.info('Module disabled', { id });
    }
    async uninstall(id) {
        const mod = this.require(id);
        if (mod.status === 'enabled')
            await this.disable(id);
        await mod.runtime.onUninstall(mod.context);
        this.modules.delete(id);
        if ((0, db_1.isDbAvailable)()) {
            await (0, db_1.getDb)().deleteFrom('core.modules').where('id', '=', id).execute();
        }
        await this.deps.events.publish(contracts_1.CoreEvents.ModuleUninstalled, { id });
    }
    /** ModuleCaller: invoke an action on a module (permission + approval gated). */
    async call(moduleId, action, input, ctx) {
        const callContext = {
            principal: ctx?.principal ?? contracts_1.SYSTEM_PRINCIPAL,
            traceId: ctx?.traceId ?? crypto.randomUUID(),
            idempotencyKey: ctx?.idempotencyKey,
        };
        return this.dispatch(moduleId, action, input, callContext);
    }
    async dispatch(moduleId, action, input, ctx, options = {}) {
        const mod = this.modules.get(moduleId);
        if (!mod) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ModuleNotFound, `Module not found: ${moduleId}`);
        }
        if (mod.status !== 'enabled') {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ModuleDisabled, `Module disabled: ${moduleId}`);
        }
        const spec = mod.runtime.manifest.actions.find((a) => a.name === action);
        if (!spec) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ActionNotFound, `Action not found: ${moduleId}/${action}`);
        }
        if (!(0, contracts_1.hasPermission)(ctx.principal, spec.permission)) {
            await this.deps.audit.record({
                actorId: ctx.principal.id,
                action: `${moduleId}.${action}`,
                outcome: 'denied',
                traceId: ctx.traceId,
                metadata: { required: spec.permission },
            });
            observability_2.moduleActions.inc({ module: moduleId, action, outcome: 'denied' });
            throw new contracts_1.BellasError(contracts_1.ErrorCode.AuthzDenied, `Permission denied: requires ${spec.permission}`);
        }
        const validInput = this.validateInput(spec, input);
        if (spec.requiresApproval && !options.skipApproval) {
            const approval = await this.deps.approvals.request({
                actorId: ctx.principal.id,
                moduleId,
                action,
                input: validInput,
                traceId: ctx.traceId,
            });
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ApprovalRequired, `Action requires approval: ${approval.id}`, { approvalId: approval.id });
        }
        try {
            const result = await mod.runtime.handle(action, validInput, ctx);
            await this.deps.audit.record({
                actorId: ctx.principal.id,
                action: `${moduleId}.${action}`,
                outcome: 'ok',
                traceId: ctx.traceId,
            });
            observability_2.moduleActions.inc({ module: moduleId, action, outcome: 'ok' });
            return (spec.outputSchema?.parse(result) ?? result);
        }
        catch (err) {
            await this.deps.audit.record({
                actorId: ctx.principal.id,
                action: `${moduleId}.${action}`,
                outcome: 'error',
                traceId: ctx.traceId,
                metadata: { error: err.message },
            });
            observability_2.moduleActions.inc({ module: moduleId, action, outcome: 'error' });
            throw err;
        }
    }
    list() {
        return [...this.modules.values()].map((m) => ({
            manifest: m.runtime.manifest,
            status: m.status,
        }));
    }
    widgets() {
        const result = [];
        for (const mod of this.modules.values()) {
            if (mod.status !== 'enabled')
                continue;
            for (const w of mod.runtime.manifest.widgets ?? []) {
                result.push({ ...w, moduleId: mod.runtime.manifest.id });
            }
        }
        return result;
    }
    validateInput(spec, input) {
        if (!spec.inputSchema)
            return input;
        const parsed = spec.inputSchema.safeParse(input);
        if (!parsed.success) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ValidationFailed, 'Invalid action input', parsed.error.flatten());
        }
        return parsed.data;
    }
    require(id) {
        const mod = this.modules.get(id);
        if (!mod) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ModuleNotFound, `Module not found: ${id}`);
        }
        return mod;
    }
    assertCompatible(manifest) {
        const [hostMajor] = contracts_1.HOST_API_VERSION.split('.');
        const [modMajor] = manifest.apiVersion.split('.');
        if (hostMajor !== modMajor) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.Conflict, `Module ${manifest.id} requires API ${manifest.apiVersion}, host is ${contracts_1.HOST_API_VERSION}`);
        }
    }
    async persist(manifest, status) {
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .insertInto('core.modules')
                .values({
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                status,
                manifest: manifest,
            })
                .onConflict((oc) => oc.column('id').doUpdateSet({
                status,
                version: manifest.version,
                manifest: manifest,
                updated_at: new Date().toISOString(),
            }))
                .execute();
        }
        catch (err) {
            log.error('module persist failed', { error: err.message });
        }
    }
}
exports.ModuleRegistry = ModuleRegistry;
//# sourceMappingURL=registry.js.map