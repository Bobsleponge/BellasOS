import { describe, expect, it } from 'vitest';
import { hasPermission, type Principal } from './security';

const base: Principal = {
  id: 'u1',
  type: 'user',
  roles: [],
  permissions: [],
};

describe('hasPermission', () => {
  it('grants on exact match', () => {
    expect(hasPermission({ ...base, permissions: ['social.read'] }, 'social.read')).toBe(true);
  });

  it('grants on global wildcard', () => {
    expect(hasPermission({ ...base, permissions: ['*'] }, 'anything.here')).toBe(true);
  });

  it('grants on domain wildcard', () => {
    expect(hasPermission({ ...base, permissions: ['social.*'] }, 'social.publish')).toBe(true);
  });

  it('denies when missing', () => {
    expect(hasPermission({ ...base, permissions: ['research.read'] }, 'social.publish')).toBe(false);
  });
});
