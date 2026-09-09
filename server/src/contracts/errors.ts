/**
 * Shared contract surface (spec §213): every API error uses one envelope and
 * every list response uses one pagination shape.
 */

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface CursorPagination {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ListResponse<T> {
  data: T[];
  pagination: CursorPagination;
}

export type CursorTuple = [sortValue: unknown, id: string];
