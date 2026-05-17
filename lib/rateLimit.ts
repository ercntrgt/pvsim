/**
 * Basit in-memory rate limiter (kullanıcı/IP başına saatlik).
 *
 * pvsim-prompt.md § Güvenlik: kullanıcı başına saatlik 50 simülasyon
 * (PVGIS hassas). Tek instance için yeterli; çok instance'ta Redis'e
 * taşınmalı.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = Number(process.env.SIM_RATE_LIMIT_PER_HOUR ?? 50),
  windowMs = 3_600_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  b.count += 1;
  const allowed = b.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
  };
}
