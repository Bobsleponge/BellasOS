"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacService = void 0;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'auth.rbac' });
/** Default role->permission grants used when the database is unavailable. */
const FALLBACK_ROLE_PERMISSIONS = {
    admin: ['*'],
    operator: [
        'module.read',
        'module.manage',
        'llm.read',
        'research.read',
        'research.run',
        'intelligence.read',
        'intelligence.run',
        'portfolio.read',
        'social.read',
        'social.draft',
        'social.schedule',
        'automation.read',
        'automation.control',
        'voice.use',
        'camera.read',
    ],
    viewer: [
        'module.read',
        'llm.read',
        'research.read',
        'intelligence.read',
        'portfolio.read',
        'social.read',
        'automation.read',
        'camera.read',
    ],
};
/** Resolves the effective permission set for a set of roles. */
class RbacService {
    async permissionsForRoles(roles) {
        if (!(0, db_1.isDbAvailable)()) {
            return this.fromFallback(roles);
        }
        try {
            const rows = await (0, db_1.getDb)()
                .selectFrom('core.role_permissions')
                .select(['permission_key'])
                .where('role_id', 'in', roles.length ? roles : ['__none__'])
                .execute();
            const perms = new Set(rows.map((r) => r.permission_key));
            return [...perms];
        }
        catch (err) {
            log.error('rbac lookup failed; using fallback', {
                error: err.message,
            });
            return this.fromFallback(roles);
        }
    }
    fromFallback(roles) {
        const perms = new Set();
        for (const role of roles) {
            for (const p of FALLBACK_ROLE_PERMISSIONS[role] ?? [])
                perms.add(p);
        }
        return [...perms];
    }
}
exports.RbacService = RbacService;
//# sourceMappingURL=rbac.js.map