// BibleDesk — platform floor: the one route wrapper for every API route.
//
// defineRoute wires together, in order:
//   1. input validation against a zod-compatible schema (any object with
//      safeParse — a real zod ZodType works directly; see doc 16 §5)
//   2. the existing auth helper (opt-in via auth: 'required')
//   3. the existing fail-closed rate limiter (opt-in via a rateLimit namespace)
//   4. the standard error envelope { success, error, code, requestId } on
//      validation failure, auth failure, rate-limit denial, and any
//      uncaught handler error.
//
// Phase D adds API keys + scopes; intentionally not here.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from './rate-limit';
import { getAuthenticatedUser } from './auth';
import type { User } from '@supabase/supabase-js';

/**
 * zod-compatible schema surface. Duck-typed on purpose: this module never
 * imports zod, so a real `z.object({...})` (or any hand-rolled parser with
 * the same shape) can be passed straight in.
 */
export interface RouteSchema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export interface RouteContext {
  requestId: string;
  user: User | null;
}

export interface DefineRouteOptions<T> {
  /** zod-compatible schema. GET/HEAD/DELETE validate the query string; other methods validate the JSON body. */
  schema?: RouteSchema<T>;
  /** Pass 'required' to deny unauthenticated requests with a 401 envelope. Routes are public by default. */
  auth?: 'required';
  /** Rate-limit namespace (see RateLimitNamespace). Over-budget requests get a 429. Omit to skip rate limiting. */
  rateLimit?: string;
  rateLimitBudget?: { limit?: number; windowMs?: number };
  handler: (req: NextRequest, input: T, ctx: RouteContext) => Promise<NextResponse> | NextResponse;
}

interface ErrorBody {
  success: false;
  error: string;
  code: string;
  requestId: string;
  details?: unknown;
}

/**
 * Standard error envelope. Also exported for handlers that want to keep
 * their own specific error messages while emitting the envelope shape.
 */
export function routeError(
  requestId: string,
  status: number,
  error: string,
  code: string,
  details?: unknown
): NextResponse {
  const body: ErrorBody = { success: false, error, code, requestId };
  if (details !== undefined) body.details = details;
  const res = NextResponse.json(body, { status });
  res.headers.set('x-request-id', requestId);
  return res;
}

function validationDetails(error: unknown): unknown {
  // zod errors expose .issues; anything else degrades to a plain string.
  if (error && typeof error === 'object' && Array.isArray((error as { issues?: unknown }).issues)) {
    return (
      error as { issues: Array<{ path?: unknown[]; message?: string; code?: string }> }
    ).issues.map((i) => ({
      path: Array.isArray(i.path) ? i.path.join('.') : undefined,
      message: i.message,
      code: i.code,
    }));
  }
  return String(error);
}

async function readInput(req: NextRequest): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return Object.fromEntries(req.nextUrl.searchParams.entries());
  }
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function defineRoute<T>(options: DefineRouteOptions<T>) {
  return async function route(req: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID();
    try {
      // 1. validate input
      let input: T;
      if (options.schema) {
        const parsed = options.schema.safeParse(await readInput(req));
        if (!parsed.success) {
          return routeError(
            requestId,
            400,
            'Invalid request parameters.',
            'VALIDATION_ERROR',
            validationDetails(parsed.error)
          );
        }
        input = parsed.data;
      } else {
        input = (await readInput(req)) as T;
      }

      // 2. auth (opt-in)
      let user: User | null = null;
      if (options.auth === 'required') {
        user = await getAuthenticatedUser(req);
        if (!user) {
          return routeError(requestId, 401, 'Authentication required.', 'UNAUTHORIZED');
        }
      }

      // 3. rate limit (opt-in, fail-closed — see rate-limit.ts)
      if (options.rateLimit) {
        const rl = await checkRateLimit(getClientIp(req), {
          namespace: options.rateLimit,
          ...(options.rateLimitBudget ?? {}),
        });
        if (!rl.allowed) {
          return routeError(requestId, 429, 'Rate limit exceeded. Try again later.', 'RATE_LIMITED');
        }
      }

      const res = await options.handler(req, input, { requestId, user });
      res.headers.set('x-request-id', requestId);
      return res;
    } catch (err) {
      console.error(`[platform] unhandled route error (${requestId}):`, err);
      return routeError(requestId, 500, 'An unexpected error occurred.', 'INTERNAL_ERROR');
    }
  };
}
