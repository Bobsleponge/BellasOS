import { z } from 'zod';
/**
 * A permission is a stable string key, e.g. `social.publish` or `portfolio.read`.
 * Modules declare the permissions they expose; roles are granted permissions.
 */
export declare const permissionSchema: z.ZodObject<{
    key: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    description: string;
}, {
    key: string;
    description?: string | undefined;
}>;
export type Permission = z.infer<typeof permissionSchema>;
export declare const roleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    description: string;
    id: string;
    name: string;
    permissions: string[];
}, {
    id: string;
    name: string;
    description?: string | undefined;
    permissions?: string[] | undefined;
}>;
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
export declare const SYSTEM_PRINCIPAL: Principal;
/** True if a principal holds a permission (supports `*` wildcard grants). */
export declare function hasPermission(principal: Principal, required: string): boolean;
//# sourceMappingURL=security.d.ts.map