import { hasPermission, type Principal } from '@bellasos/contracts';

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

export class PolicyEngine {
  private readonly policies: Policy[] = [];

  add(policy: Policy): void {
    this.policies.push(policy);
  }

  /** Deny if any policy returns false; allow otherwise (default-allow + RBAC). */
  evaluate(ctx: PolicyContext): boolean {
    return this.policies.every((p) => p(ctx));
  }
}

/** Example policy: restricted resources require an explicit elevated permission. */
export const restrictedDataPolicy: Policy = (ctx) => {
  const classification = ctx.resource?.['classification'];
  if (classification === 'restricted') {
    return hasPermission(ctx.principal, 'platform.admin');
  }
  return true;
};

/** Example policy: a principal may only mutate resources it owns (unless admin). */
export const ownershipPolicy: Policy = (ctx) => {
  const ownerId = ctx.resource?.['ownerId'];
  if (!ownerId) return true;
  if (hasPermission(ctx.principal, 'platform.admin')) return true;
  return ownerId === ctx.principal.id;
};
