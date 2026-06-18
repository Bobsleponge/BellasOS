"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PRINCIPAL = exports.roleSchema = exports.permissionSchema = void 0;
exports.hasPermission = hasPermission;
const zod_1 = require("zod");
/**
 * A permission is a stable string key, e.g. `social.publish` or `portfolio.read`.
 * Modules declare the permissions they expose; roles are granted permissions.
 */
exports.permissionSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    description: zod_1.z.string().default(''),
});
exports.roleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().default(''),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.SYSTEM_PRINCIPAL = {
    id: 'system',
    type: 'system',
    displayName: 'BellasOS System',
    roles: ['system'],
    permissions: ['*'],
};
/** True if a principal holds a permission (supports `*` wildcard grants). */
function hasPermission(principal, required) {
    if (principal.permissions.includes('*'))
        return true;
    if (principal.permissions.includes(required))
        return true;
    // Support prefix wildcards like `social.*`.
    const [domain] = required.split('.');
    return principal.permissions.includes(`${domain}.*`);
}
//# sourceMappingURL=security.js.map