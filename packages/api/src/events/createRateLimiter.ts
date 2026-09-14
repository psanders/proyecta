/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/**
 * Fixed-window, in-memory rate limiter (single instance). `take(key)` returns false once `limit`
 * attempts happened within the current window for that key.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    take(key: string): boolean {
      const at = now();
      const window = windows.get(key);
      if (!window || at - window.start >= windowMs) {
        windows.set(key, { start: at, count: 1 });
        return true;
      }
      window.count += 1;
      return window.count <= limit;
    }
  };
}
