/**
 * Authorization gates (spec §41). The backend is authoritative:
 * requireAuth → requireRole/requirePermission → service checks → RLS.
 */
import type { NextFunction, Request, Response } from 'express';
import { roleCan, type Permission } from '../auth/permissions.js';
import type { Role } from '../auth/types.js';
import { AUTH_ERROR_CODES as C } from '../auth/types.js';
import { httpErrors } from './errors.js';

/** Membership role must be one of `roles`. platform_admin only passes if
 *  explicitly listed — it has no implicit practice privileges. */
export function requireRole(...roles: Role[]) {
  return function requireRoleMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.membership) {
      next(httpErrors.forbidden(C.MEMBERSHIP_REQUIRED, 'No active organization membership.'));
      return;
    }
    if (!roles.includes(req.membership.role)) {
      next(httpErrors.forbidden(C.FORBIDDEN, 'You do not have permission to do that.'));
      return;
    }
    next();
  };
}

/** Membership role must hold the given permission. */
export function requirePermission(permission: Permission) {
  return function requirePermissionMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.membership) {
      next(httpErrors.forbidden(C.MEMBERSHIP_REQUIRED, 'No active organization membership.'));
      return;
    }
    if (!roleCan(req.membership.role, permission)) {
      next(httpErrors.forbidden(C.FORBIDDEN, 'You do not have permission to do that.'));
      return;
    }
    next();
  };
}
