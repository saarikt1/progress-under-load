type RateLimiterOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimiter = {
  isLimited: (key: string) => boolean;
  reset: () => void;
};

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const store = new Map<string, RateLimitEntry>();
  let lastCleanup = Date.now();
  const cleanupInterval = options.windowMs;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
    lastCleanup = now;
  };

  const isLimited = (key: string) => {
    const now = Date.now();

    if (now - lastCleanup > cleanupInterval) {
      cleanup();
    }

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return false;
    }

    if (entry.count >= options.limit) {
      return true;
    }

    entry.count += 1;
    return false;
  };

  const reset = () => {
    store.clear();
    lastCleanup = Date.now();
  };

  return { isLimited, reset };
}
