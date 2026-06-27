import { type Principal } from '@bellasos/contracts';
/**
 * Attribute-Based Access Control (ABAC) seam. RBAC answers "does this role have
 * this permission"; ABAC layers contextual rules on top (ownership, data
 * classification, time-of-day, environment). Policies are evaluated AFTER the
 * RBAC permission check in `dispatch`, so ABAC can only further restrict.
 */
export interface PolicyContext {
    principal: Principal;
    action: string;
    resource?: Record<string, unknown>;
}
export type Policy = (ctx: PolicyContext) => boolean;
export declare class PolicyEngine {
    private readonly policies;
    add(policy: Policy): void;
    /** Deny if any policy returns false; allow otherwise (default-allow + RBAC). */
    evaluate(ctx: PolicyContext): boolean;
}
/** Example policy: restricted resources require an explicit elevated permission. */
export declare const restrictedDataPolicy: Policy;
/** Example policy: a principal may only mutate resources it owns (unless admin). */
export declare const ownershipPolicy: Policy;
//# sourceMappingURL=policy.d.ts.map