// Unit tests for rate-limit module

import { checkRateLimit } from '../rate-limit';

// Reset the rate limit store between tests
// Note: Since the module uses module-scoped state, we test with unique IPs

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const result = checkRateLimit('test-allow-' + Date.now());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks requests exceeding the limit', () => {
    const ip = 'test-block-' + Date.now();
    // Exhaust the default limit (30 requests)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks remaining requests', () => {
    const ip = 'test-remaining-' + Date.now();
    const result1 = checkRateLimit(ip);
    expect(result1.remaining).toBe(29);
    const result2 = checkRateLimit(ip);
    expect(result2.remaining).toBe(28);
  });

  it('allows different IPs independently', () => {
    const ip1 = 'test-independent-1-' + Date.now();
    const ip2 = 'test-independent-2-' + Date.now();
    // Exhaust ip1
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip1);
    }
    expect(checkRateLimit(ip1).allowed).toBe(false);
    expect(checkRateLimit(ip2).allowed).toBe(true);
  });

  it('resets after window expires', () => {
    const ip = 'test-reset-' + Date.now();
    // Use a very short window (1ms) to test reset
    const result1 = checkRateLimit(ip, 1, 1); // 1 request per 1ms
    expect(result1.allowed).toBe(true);
    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result2 = checkRateLimit(ip, 1, 1);
        expect(result2.allowed).toBe(true);
        resolve();
      }, 10);
    });
  });

  it('uses default values when not specified', () => {
    const ip = 'test-defaults-' + Date.now();
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('respects custom maxRequests', () => {
    const ip = 'test-custom-' + Date.now();
    const result = checkRateLimit(ip, 5, 60_000);
    expect(result.remaining).toBe(4);
    // Exhaust 5 requests
    for (let i = 0; i < 4; i++) {
      checkRateLimit(ip, 5, 60_000);
    }
    expect(checkRateLimit(ip, 5, 60_000).allowed).toBe(false);
  });
});
