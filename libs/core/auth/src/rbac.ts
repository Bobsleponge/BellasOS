import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'auth.rbac' });

/** Default role->permission grants used when the database is unavailable. */
const FALLBACK_ROLE_PERMISSIONS: Record<string, string[]> = {
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
    'finance-tracker.read',
    'finance-tracker.manage',
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
    'finance-tracker.read',
    'social.read',
    'automation.read',
    'camera.read',
  ],
};

/** Resolves the effective permission set for a set of roles. */
export class RbacService {
  async permissionsForRoles(roles: string[]): Promise<string[]> {
    if (!isDbAvailable()) {
      return this.fromFallback(roles);
    }
    try {
      const rows = await getDb()
        .selectFrom('core.role_permissions')
        .select(['permission_key'])
        .where('role_id', 'in', roles.length ? roles : ['__none__'])
        .execute();
      const perms = new Set(rows.map((r) => r.permission_key));
      return [...perms];
    } catch (err) {
      log.error('rbac lookup failed; using fallback', {
        error: (err as Error).message,
      });
      return this.fromFallback(roles);
    }
  }

  private fromFallback(roles: string[]): string[] {
    const perms = new Set<string>();
    for (const role of roles) {
      for (const p of FALLBACK_ROLE_PERMISSIONS[role] ?? []) perms.add(p);
    }
    return [...perms];
  }
}
