import "server-only";

const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter per visitor (in memory: per server instance, which is enough as a guard on top of the
 * API's own limits). Returns true when the call is allowed and records it.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
