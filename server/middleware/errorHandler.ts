/**
 * Central error handler implementing the spec §42 contract:
 *   { "error": { "code", "message", "details"?, "requestId"? } }
 * Internal messages (DB errors, stacks) are logged server-side only.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, zodDetails } from './errors.js';
import { AUTH_ERROR_CODES as C } from '../auth/types.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: C.NOT_FOUND,
      message: 'Resource not found.',
      requestId: req.requestId,
    },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toBody(requestId));
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: C.VALIDATION_ERROR,
        message: 'Request validation failed.',
        details: zodDetails(err),
        requestId,
      },
    });
    return;
  }

  // Malformed JSON bodies surface as SyntaxError from the body parser.
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({
      error: {
        code: C.VALIDATION_ERROR,
        message: 'Malformed request body.',
        requestId,
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[${requestId ?? 'req_unknown'}] Unhandled error:`, err);
  res.status(500).json({
    error: {
      code: C.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
      requestId,
    },
  });
}
