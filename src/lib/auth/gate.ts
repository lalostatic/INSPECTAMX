import type { Role } from '../types';
import { canAccessDev, canAccessAdmin, canAccessApp } from './roles';

export interface RouteGuardOptions {
  allowedRoles?: Role[];
  requireTenant?: boolean;
  requireDev?: boolean;
  requireAdmin?: boolean;
}

export function checkRouteAccess(
  userRole: Role | undefined,
  hasTenant: boolean,
  options: RouteGuardOptions
): { allowed: boolean; redirectTo: string } {
  if (!userRole) {
    return { allowed: false, redirectTo: '/login' };
  }

  if (options.requireDev && !canAccessDev(userRole)) {
    return { allowed: false, redirectTo: '/login' };
  }

  if (options.requireAdmin && !canAccessAdmin(userRole)) {
    return { allowed: false, redirectTo: '/app' };
  }

  if (options.allowedRoles && !options.allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard
    if (canAccessDev(userRole)) return { allowed: false, redirectTo: '/dev' };
    if (canAccessAdmin(userRole)) return { allowed: false, redirectTo: '/admin' };
    if (canAccessApp(userRole)) return { allowed: false, redirectTo: '/app' };
    return { allowed: false, redirectTo: '/login' };
  }

  if (options.requireTenant && !hasTenant) {
    return { allowed: false, redirectTo: '/login' };
  }

  return { allowed: true, redirectTo: '' };
}
