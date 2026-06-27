"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownershipPolicy = exports.restrictedDataPolicy = exports.PolicyEngine = void 0;
const contracts_1 = require("@bellasos/contracts");
class PolicyEngine {
    policies = [];
    add(policy) {
        this.policies.push(policy);
    }
    /** Deny if any policy returns false; allow otherwise (default-allow + RBAC). */
    evaluate(ctx) {
        return this.policies.every((p) => p(ctx));
    }
}
exports.PolicyEngine = PolicyEngine;
/** Example policy: restricted resources require an explicit elevated permission. */
const restrictedDataPolicy = (ctx) => {
    const classification = ctx.resource?.['classification'];
    if (classification === 'restricted') {
        return (0, contracts_1.hasPermission)(ctx.principal, 'platform.admin');
    }
    return true;
};
exports.restrictedDataPolicy = restrictedDataPolicy;
/** Example policy: a principal may only mutate resources it owns (unless admin). */
const ownershipPolicy = (ctx) => {
    const ownerId = ctx.resource?.['ownerId'];
    if (!ownerId)
        return true;
    if ((0, contracts_1.hasPermission)(ctx.principal, 'platform.admin'))
        return true;
    return ownerId === ctx.principal.id;
};
exports.ownershipPolicy = ownershipPolicy;
//# sourceMappingURL=policy.js.map