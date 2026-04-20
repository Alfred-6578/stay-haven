import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter.
 *
 * Suitable for single-instance deployments and dev. On serverless or
 * multi-replica setups the counters will diverge per instance — swap
 * this for a Redis-backed limiter before scaling out.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so expired buckets don't accumulate. Only runs when
// the module is hot (dev + long-running node).
const SWEEP_MS = 60_000;
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, SWEEP_MS).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, max - existing.count);
  const allowed = existing.count <= max;
  const retryAfter = allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000);

  return { allowed, remaining, resetAt: existing.resetAt, retryAfter };
}

/**
 * Derive a reasonable client key for rate-limiting from request headers.
 * Prefer `x-forwarded-for` (first IP in the chain) since Next runs behind
 * a proxy in production; fall back to `x-real-ip` and finally a constant.
 */
export function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Helper that pairs clientKey + rateLimit and returns a 429 NextResponse
 * ready to return when the limit is exceeded. Returns `null` when the
 * request is allowed through.
 */
export function enforceRateLimit(
  request: NextRequest,
  route: string,
  max: number,
  windowMs: number
): NextResponse | null {
  const key = `${route}:${clientKey(request)}`;
  const result = rateLimit(key, max, windowMs);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      success: false,
      message: "Too many requests",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    }
  );
}
