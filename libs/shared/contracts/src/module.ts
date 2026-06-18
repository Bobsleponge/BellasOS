import { z } from 'zod';
import type { Permission } from './security';
import type { Principal } from './security';
import type { EventBus, EventSpec } from './events';
import type { AIGateway } from './ai';
import type { MemoryGateway } from './memory';

/** Host contract version the module is built against (semver major.minor). */
export const HOST_API_VERSION = '1.0';

export type SettingType = 'string' | 'number' | 'boolean' | 'secret' | 'json';

export interface SettingSpec {
  key: string;
  type: SettingType;
  label: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  /** Secrets are stored via the secrets backend and never returned in plaintext. */
  secret?: boolean;
}

export interface ActionSpec {
  /** Action name, namespaced under the module id, e.g. `draft.create`. */
  name: string;
  description: string;
  /** Permission required to invoke this action. */
  permission: string;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  /** When true, invocation creates an Approval and waits for resolution. */
  requiresApproval?: boolean;
}

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export interface WidgetSpec {
  id: string;
  title: string;
  /** The web app maps this component key to a registered React component. */
  component: string;
  defaultSize: WidgetSize;
  /** Permission required to view the widget. */
  permission?: string;
  /** Action used to fetch the widget's data payload. */
  dataAction?: string;
}

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  description: string;
  permissions: Permission[];
  actions: ActionSpec[];
  events: EventSpec[];
  settings: SettingSpec[];
  widgets?: WidgetSpec[];
  /** Capability dependencies (other module ids), never code imports. */
  dependencies?: string[];
}

/** Per-module scoped key/value store backed by a private DB namespace. */
export interface ScopedDb {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list<T = unknown>(prefix?: string): Promise<Array<{ key: string; value: T }>>;
}

/** Namespaced configuration + secrets accessor for a module. */
export interface ConfigStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

/** Invokes actions on other modules via the registry (permission-checked). */
export interface ModuleCaller {
  call<T = unknown>(
    moduleId: string,
    action: string,
    input: unknown,
    ctx?: Partial<CallContext>,
  ): Promise<T>;
}

/** Long-lived context handed to a module at lifecycle boundaries. */
export interface ModuleContext {
  moduleId: string;
  events: EventBus;
  call: ModuleCaller;
  config: ConfigStore;
  logger: Logger;
  ai: AIGateway;
  memory: MemoryGateway;
  storage: ScopedDb;
}

/** Per-invocation context carrying the principal + trace correlation id. */
export interface CallContext {
  principal: Principal;
  traceId: string;
  idempotencyKey?: string;
}

/**
 * The runtime a module must implement. Lifecycle hooks let the registry install,
 * enable, disable and uninstall modules without affecting the rest of the system.
 */
export interface ModuleRuntime {
  readonly manifest: ModuleManifest;
  onInstall(ctx: ModuleContext): Promise<void>;
  onEnable(ctx: ModuleContext): Promise<void>;
  onDisable(ctx: ModuleContext): Promise<void>;
  onUninstall(ctx: ModuleContext): Promise<void>;
  handle(action: string, input: unknown, ctx: CallContext): Promise<unknown>;
}

export type ModuleStatus =
  | 'registered'
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'error';
