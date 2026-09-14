import type { Role } from '../types';

export const ROLE_HIERARCHY: Record<Role, number> = {
  developer: 100,
  company_admin: 80,
  supervisor: 60,
  inspector: 40,
  mr_tech: 40,
};

export const ROLE_LABELS: Record<Role, string> = {
  developer: 'Desarrollador',
  company_admin: 'Administrador de empresa',
  supervisor: 'Supervisor',
  inspector: 'Inspector',
  mr_tech: 'Técnico M&R',
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  developer: ['*'],
  company_admin: [
    'tenants:read',
    'users:*',
    'branches:*',
    'inspections:*',
    'containers:*',
    'inventory:*',
    'mr:*',
    'tasks:*',
    'incidents:*',
    'reports:*',
    'catalog:*',
    'templates:*',
  ],
  supervisor: [
    'inspections:read',
    'inspections:approve',
    'containers:read',
    'inventory:read',
    'mr:read',
    'tasks:*',
    'incidents:*',
    'reports:read',
  ],
  inspector: [
    'inspections:create',
    'inspections:read',
    'inspections:update:own',
    'containers:read',
    'inventory:read',
    'tasks:read:assigned',
    'incidents:create',
  ],
  mr_tech: [
    'mr:read:assigned',
    'mr:update:assigned',
    'inventory:read',
    'inventory:update',
    'containers:read',
    'tasks:read:assigned',
    'incidents:create',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;

  // Check wildcard at category level
  const [category, action] = permission.split(':');
  if (perms.includes(`${category}:*`)) return true;

  // Check partial matches
  return perms.some((p) => {
    if (p === permission) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2);
      return permission.startsWith(prefix);
    }
    return false;
  });
}

export function canAccessDev(role: Role): boolean {
  return role === 'developer';
}

export function canAccessAdmin(role: Role): boolean {
  return role === 'developer' || role === 'company_admin';
}

export function canAccessApp(role: Role): boolean {
  return role !== 'developer';
}

export function getDefaultRoute(role: Role): string {
  switch (role) {
    case 'developer':
      return '/dev';
    case 'company_admin':
    case 'supervisor':
      return '/admin';
    default:
      return '/app';
  }
}
