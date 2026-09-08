/**
 * CSRF defense for cookie-authenticated mutating requests:
 * sameSite=Lax cookies (session.ts) + a required custom header.
 * Cross-origin forms cannot set custom headers without a CORS preflight,
 * and this API does not grant cross-origin credentialed access, so the
 * header requirement blocks CSRF on POST/PUT/PATCH/DELETE.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AUTH_ERROR_CODES as C } from '../auth/types.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CsrfGuardOptions {
  /** Only enforce on paths starting with this prefix. Default '/api'. */
  pathPrefix?: string;
  header?: string;
}

export function csrfGuard(options: CsrfGuardOptions = {}): RequestHandler {
  const pathPrefix = options.pathPrefix ?? '/api';
  const header = (options.header ?? 'x-requested-with').toLowerCase();

  return function csrfGuardMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }
    if (!req.path.startsWith(pathPrefix) && !req.originalUrl.startsWith(pathPrefix)) {
      next();
      return;
    }
    const value = req.headers[header];
    if (typeof value !== 'string' || value.length === 0) {
      res.status(403).json({
        error: {
          code: C.CSRF_MISSING_HEADER,
          message: 'Missing X-Requested-With header.',
          requestId: req.requestId,
        },
      });
      return;
    }
    next();
  };
}
