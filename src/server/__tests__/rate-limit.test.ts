import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits requests within window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(true);
  });

  it("resets after window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(true);

    vi.advanceTimersByTime(1001);

    expect(limiter.isLimited("key1")).toBe(false);
  });

  it("handles multiple keys independently", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key2")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(false);
    expect(limiter.isLimited("key1")).toBe(true);
    expect(limiter.isLimited("key2")).toBe(false);
  });

  it("cleans up expired keys implicitly", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

    // Add key1
    limiter.isLimited("key1");

    // Advance time past window to ensure it expires
    vi.advanceTimersByTime(1100);

    // Trigger cleanup by accessing another key
    // In our implementation, accessing *any* key triggers cleanup if interval passed
    limiter.isLimited("key2");

    // key1 should be expired. Accessing it should be allowed (reset).
    expect(limiter.isLimited("key1")).toBe(false);
  });
});
