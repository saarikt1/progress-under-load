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

  const isLimited = (key: string) => {
    const now = Date.now();
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
  };

  return { isLimited, reset };
}
