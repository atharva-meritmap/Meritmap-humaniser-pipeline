/**
 * Simple in-memory rate limiter per IP.
 * Tracks request counts within a sliding time window.
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateBucket>();

// Clean up expired entries every 2 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 120_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number } {
  cleanup();

  const now = Date.now();
  let bucket = store.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(ip, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, maxRequests - bucket.count);
  return { allowed: bucket.count <= maxRequests, remaining };
}
