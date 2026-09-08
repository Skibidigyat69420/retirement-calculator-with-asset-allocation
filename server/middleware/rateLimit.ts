/**
 * In-memory sliding-window rate limiter (spec §202).
 * Keyed per client IP + route so bursts on one endpoint do not starve
 * others. Process-local by design; document Redis for multi-instance
 * deployments in docs/AUTHORIZATION.md.
 */
import type { NextFunction, Request, Response } from 'express';
import { AUTH_ERROR_CODES as C } from '../auth/types.js';

export interface RateLimiterOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests per window per key. */
  max: number;
  /** Route key: defaults to req.baseUrl + req.path (IP + route, per spec). */
  keyGenerator?: (req: Request) => string;
  /** Injectable clock (testing). */
  now?: () => number;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimiter {
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  /** Test/ops hook: current request counts per key. */
  snapshot: () => Map<string, number>;
  reset: () => void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max, keyGenerator, now = Date.now } = options;
  const hits = new Map<string, number[]>();

  function clientIp(req: Request): string {
    return (req.ip ?? req.socket.remoteAddress ?? 'unknown').toString();
  }

  function middleware(req: Request, res: Response, next: NextFunction): void {
    const key = `${clientIp(req)}:${keyGenerator ? keyGenerator(req) : `${req.baseUrl}${req.path}`}`;
    const current = now();
    const windowStart = current - windowMs;

    let timestamps = hits.get(key);
    if (!timestamps) {
      timestamps = [];
      hits.set(key, timestamps);
    }
    // Slide the window.
    while (timestamps.length > 0 && (timestamps[0] ?? 0) <= windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= max) {
      const oldest = timestamps[0] ?? current;
      const retryAfterMs = oldest + windowMs - current;
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((current + retryAfterMs) / 1000)));
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({
        error: {
          code: C.RATE_LIMITED,
          message: 'Too many requests. Please slow down and try again.',
          details: { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) },
          requestId: req.requestId,
        },
      });
      return;
    }

    timestamps.push(current);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - timestamps.length));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((current + windowMs) / 1000)));
    next();
  }

  return {
    middleware,
    snapshot: () => new Map([...hits.entries()].map(([k, v]) => [k, v.length])),
    reset: () => hits.clear(),
  };
}
