/**
 * API error contract (spec §42):
 *   { "error": { "code", "message", "details"?, "requestId"? } }
 * Internal database messages / stack traces are never exposed.
 */

export type ErrorCode = string;

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toBody(requestId?: string): ErrorBody {
    const body: ErrorBody['error'] = { code: this.code, message: this.message };
    if (this.details !== undefined) body.details = this.details;
    if (requestId) body.requestId = requestId;
    return { error: body };
  }
}

export const httpErrors = {
  badRequest: (code: ErrorCode, message: string, details?: unknown) =>
    new AppError(400, code, message, details),
  unauthorized: (code: ErrorCode, message: string) => new AppError(401, code, message),
  forbidden: (code: ErrorCode, message: string) => new AppError(403, code, message),
  notFound: (code: ErrorCode, message: string) => new AppError(404, code, message),
  conflict: (code: ErrorCode, message: string) => new AppError(409, code, message),
  tooMany: (code: ErrorCode, message: string, details?: unknown) =>
    new AppError(429, code, message, details),
};

/** zod error → VALIDATION_ERROR body details. */
export function zodDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
}
