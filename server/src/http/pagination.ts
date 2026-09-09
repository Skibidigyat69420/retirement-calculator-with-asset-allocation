import type { ListResponse, CursorTuple } from '../contracts/errors.js';
import { ApiError } from './errors.js';

export interface ParsedPagination {
  limit: number;
  cursor?: string;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse cursor pagination query params:
 *   limit  — page size, default 25, clamped to [1, 100]
 *   cursor — base64url-encoded JSON [sortValue, id] tuple from a previous page
 */
export function parseCursorPagination(query: unknown): ParsedPagination {
  const q = (query ?? {}) as Record<string, unknown>;
  const rawLimit = q['limit'];
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== undefined && rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < MIN_LIMIT) limit = MIN_LIMIT;
    else if (n > MAX_LIMIT) limit = MAX_LIMIT;
    else limit = n;
  }
  const rawCursor = q['cursor'];
  const cursor =
    typeof rawCursor === 'string' && rawCursor.length > 0 ? rawCursor : undefined;
  return cursor === undefined ? { limit } : { limit, cursor };
}

export function decodeCursor(cursor: string): CursorTuple {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as unknown;
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid cursor encoding.');
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[1] !== 'string'
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid cursor shape.');
  }
  return [parsed[0], parsed[1]];
}

/** Build the next cursor from the last row of the current page. */
export function encodeNextCursor<T>(
  lastRow: T | undefined,
  sortKey: keyof T & string,
): string | null {
  if (!lastRow) return null;
  const sortValue = lastRow[sortKey];
  const id = (lastRow as Record<string, unknown>)['id'];
  if (typeof id !== 'string') return null;
  return Buffer.from(
    JSON.stringify([sortValue ?? null, id] satisfies CursorTuple),
    'utf8',
  ).toString('base64url');
}

export function listResponse<T>(
  data: T[],
  options: { limit: number; cursorFor: (lastRow: T) => string | null },
): ListResponse<T> {
  const lastRow = data.at(-1);
  const nextCursor =
    data.length === options.limit && lastRow !== undefined
      ? options.cursorFor(lastRow)
      : null;
  return {
    data,
    pagination: { nextCursor, hasMore: nextCursor !== null },
  };
}
