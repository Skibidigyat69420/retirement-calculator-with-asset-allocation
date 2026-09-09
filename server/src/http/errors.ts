import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config.js';

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  ORG_CONTEXT_REQUIRED: 'ORG_CONTEXT_REQUIRED',
  ORG_ACCESS_DENIED: 'ORG_ACCESS_DENIED',
  CLIENT_ACCESS_DENIED: 'CLIENT_ACCESS_DENIED',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errors = {
  unauthorized: (msg = 'Authentication required.') =>
    new ApiError(401, ERROR_CODES.UNAUTHORIZED, msg),
  orgContextRequired: () =>
    new ApiError(
      400,
      ERROR_CODES.ORG_CONTEXT_REQUIRED,
      'Missing x-organization-id header.',
    ),
  orgAccessDenied: () =>
    new ApiError(
      403,
      ERROR_CODES.ORG_ACCESS_DENIED,
      'You do not have access to this organization.',
    ),
  clientAccessDenied: () =>
    new ApiError(
      403,
      ERROR_CODES.CLIENT_ACCESS_DENIED,
      'You do not have access to this client.',
    ),
  clientNotFound: () =>
    new ApiError(404, ERROR_CODES.CLIENT_NOT_FOUND, 'Client not found.'),
  rateLimited: () =>
    new ApiError(
      429,
      ERROR_CODES.RATE_LIMITED,
      'Too many requests. Please slow down.',
    ),
  internal: (internalMessage?: string) =>
    new ApiError(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'Internal server error.',
      internalMessage ? { internal: internalMessage } : undefined,
    ),
};

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, request, reply) => {
    const requestId = request.requestId ?? 'req_unknown';

    if (err instanceof ApiError) {
      const body: ErrorBody = {
        error: {
          code: err.code,
          message: err.message,
          requestId,
        },
      };
      // Internal details only outside production.
      if (err.details !== undefined && env.NODE_ENV !== 'production') {
        body.error.details = err.details;
      }
      return reply.status(err.statusCode).send(body);
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Request validation failed.',
          requestId,
          details: err.issues,
        },
      });
    }

    // @fastify/rate-limit throws with statusCode 429
    const anyErr = err as { statusCode?: number; message?: string };
    if (anyErr.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Too many requests. Please slow down.',
          requestId,
        },
      });
    }

    request.log.error({ err }, 'unhandled error');

    const isProd = env.NODE_ENV === 'production';
    const status =
      Number.isInteger(anyErr.statusCode) && (anyErr.statusCode as number) < 500
        ? (anyErr.statusCode as number)
        : 500;
    const body: ErrorBody = {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: isProd ? 'Internal server error.' : (anyErr.message ?? 'Unknown error'),
        requestId,
      },
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Route ${request.method} ${request.url} not found.`,
        requestId: request.requestId ?? 'req_unknown',
      },
    });
  });
}
