import { z } from 'zod';

/**
 * A permission is a stable string key, e.g. `social.publish` or `portfolio.read`.
 * Modules declare the permissions they expose; roles are granted permissions.
 */
export const permissionSchema = z.object({
  key: z.string().min(1),
  description: z.string().default(''),
});
export type Permission = z.infer<typeof permissionSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  permissions: z.array(z.string()).default([]),
});
export type Role = z.infer<typeof roleSchema>;

/**
 * The authenticated principal attached to every request and propagated to
 * events, AI calls and module actions for end-to-end authorization + audit.
 */
export interface Principal {
  id: string;
  type: 'user' | 'service' | 'agent' | 'system';
  displayName?: string;
  roles: string[];
  permissions: string[];
  /** Arbitrary attributes consumed by the (future) ABAC policy engine. */
  attributes?: Record<string, unknown>;
}

export const SYSTEM_PRINCIPAL: Principal = {
  id: 'system',
  type: 'system',
  displayName: 'BellasOS System',
  roles: ['system'],
  permissions: ['*'],
};

/** True if a principal holds a permission (supports `*` wildcard grants). */
export function hasPermission(principal: Principal, required: string): boolean {
  if (principal.permissions.includes('*')) return true;
  if (principal.permissions.includes(required)) return true;
  // Support prefix wildcards like `social.*`.
  const [domain] = required.split('.');
  return principal.permissions.includes(`${domain}.*`);
}
