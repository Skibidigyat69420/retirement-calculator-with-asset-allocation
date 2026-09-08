/**
 * Authentication gate. Requires requestContext to have run.
 */
import type { NextFunction, Request, Response } from 'express';
import { httpErrors } from './errors.js';
import { AUTH_ERROR_CODES as C } from '../auth/types.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session || !req.user) {
    next(httpErrors.unauthorized(C.NOT_AUTHENTICATED, 'Authentication required.'));
    return;
  }
  next();
}
