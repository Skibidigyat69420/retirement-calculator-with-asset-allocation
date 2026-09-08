import type { PoolClient } from 'pg';
import type { SessionRow, Role } from '../auth/types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Per-request id (spec §42 requestId / §137 request IDs). */
      requestId?: string;
      /** Validated session row, set by requestContext. */
      session?: SessionRow;
      /** Authenticated user summary, set by requestContext. */
      user?: {
        id: string;
        email: string;
        fullName: string;
        status: string;
      };
      /** Active-organization membership, set by requestContext. */
      membership?: {
        organizationId: string;
        role: Role;
        status: string;
      };
      /**
       * Request-scoped database client with SET LOCAL tenant context
       * inside an open transaction (spec §§35-36). Use for all
       * repository queries in the request; committed on response finish.
       */
      db?: PoolClient;
    }
  }
}

export {};
