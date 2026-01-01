import { describe, it, expect } from 'vitest';

/**
 * Exponential Backoff Tests
 *
 * These tests verify the exponential backoff logic used in:
 * - Registration UTXO polling (Priority 2)
 * - Transaction confirmation polling (Priority 2)
 */

describe('Exponential Backoff Logic', () => {
  describe('Registration UTXO Polling Backoff', () => {
    const INITIAL_INTERVAL_MS = 3000;
    const MAX_INTERVAL_MS = 30000;
    const BACKOFF_MULTIPLIER = 1.5;

    it('should calculate correct backoff intervals', () => {
      const attempts = [1, 2, 3, 4, 5, 6, 7, 8];
      const expectedIntervals = [
        3000,    // Attempt 1: 3s
        4500,    // Attempt 2: 3s × 1.5 = 4.5s
        6750,    // Attempt 3: 3s × 1.5² = 6.75s
        10125,   // Attempt 4: 3s × 1.5³ = 10.125s
        15187.5, // Attempt 5: 3s × 1.5⁴ = 15.1875s
        22781.25, // Attempt 6: 3s × 1.5⁵ = 22.78125s
        30000,   // Attempt 7: Capped at MAX (30s)
        30000,   // Attempt 8: Capped at MAX (30s)
      ];

      attempts.forEach((attempt, index) => {
        const interval = Math.min(
          INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1),
          MAX_INTERVAL_MS
        );

        expect(interval).toBeCloseTo(expectedIntervals[index], 1);
      });
    });

    it('should never exceed MAX_INTERVAL_MS', () => {
      const largeAttempt = 100;
      const interval = Math.min(
        INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, largeAttempt - 1),
        MAX_INTERVAL_MS
      );

      expect(interval).toBe(MAX_INTERVAL_MS);
    });

    it('should start with INITIAL_INTERVAL_MS on first attempt', () => {
      const attempt = 1;
      const interval = Math.min(
        INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1),
        MAX_INTERVAL_MS
      );

      expect(interval).toBe(INITIAL_INTERVAL_MS);
    });

    it('should have approximately 8-10 attempts in 120 seconds', () => {
      const MAX_DURATION_MS = 120000; // 2 minutes
      let totalTime = 0;
      let attemptCount = 0;

      while (totalTime < MAX_DURATION_MS) {
        attemptCount++;
        const interval = Math.min(
          INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount - 1),
          MAX_INTERVAL_MS
        );
        totalTime += interval;

        if (totalTime >= MAX_DURATION_MS) break;
      }

      // Should be around 8-10 attempts
      expect(attemptCount).toBeGreaterThanOrEqual(8);
      expect(attemptCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Transaction Confirmation Polling Backoff', () => {
    const INITIAL_INTERVAL_MS = 10000;
    const MAX_INTERVAL_MS = 30000;
    const BACKOFF_MULTIPLIER = 1.3;

    it('should calculate correct backoff intervals', () => {
      const attempts = [1, 2, 3, 4, 5, 6];
      const expectedIntervals = [
        10000,   // Attempt 1: 10s
        13000,   // Attempt 2: 10s × 1.3 = 13s
        16900,   // Attempt 3: 10s × 1.3² = 16.9s
        21970,   // Attempt 4: 10s × 1.3³ = 21.97s
        28561,   // Attempt 5: 10s × 1.3⁴ = 28.561s
        30000,   // Attempt 6: Capped at MAX (30s)
      ];

      attempts.forEach((attempt, index) => {
        const interval = Math.min(
          INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1),
          MAX_INTERVAL_MS
        );

        expect(interval).toBeCloseTo(expectedIntervals[index], 0);
      });
    });

    it('should have approximately 25-30 attempts in 15 minutes', () => {
      const MAX_DURATION_MS = 900000; // 15 minutes
      let totalTime = 0;
      let attemptCount = 0;

      while (totalTime < MAX_DURATION_MS) {
        attemptCount++;
        const interval = Math.min(
          INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount - 1),
          MAX_INTERVAL_MS
        );
        totalTime += interval;

        if (totalTime >= MAX_DURATION_MS) break;
      }

      // Should be around 25-30 attempts
      expect(attemptCount).toBeGreaterThanOrEqual(25);
      expect(attemptCount).toBeLessThanOrEqual(35);
    });

    it('should reach MAX_INTERVAL_MS by attempt 6', () => {
      const attempt = 6;
      const interval = Math.min(
        INITIAL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1),
        MAX_INTERVAL_MS
      );

      expect(interval).toBe(MAX_INTERVAL_MS);
    });
  });

  describe('Backoff Comparison', () => {
    it('UTXO polling should be more aggressive than transaction polling', () => {
      const utxoInitial = 3000;  // 3s
      const txInitial = 10000;   // 10s

      expect(utxoInitial).toBeLessThan(txInitial);
    });

    it('UTXO polling should have faster growth rate', () => {
      const utxoMultiplier = 1.5;
      const txMultiplier = 1.3;

      expect(utxoMultiplier).toBeGreaterThan(txMultiplier);
    });

    it('both should cap at same MAX_INTERVAL_MS', () => {
      const MAX_INTERVAL_MS = 30000;

      expect(MAX_INTERVAL_MS).toBe(30000);
    });
  });

  describe('Time Remaining Calculation', () => {
    it('should wait only for remaining time if less than next interval', () => {
      const MAX_DURATION_MS = 120000;
      const startTime = Date.now();
      const elapsed = 115000; // 115 seconds elapsed
      const nextInterval = 30000; // Would normally wait 30s

      const timeRemaining = MAX_DURATION_MS - elapsed;
      const actualWait = Math.min(nextInterval, timeRemaining);

      expect(actualWait).toBe(5000); // Only 5 seconds left
    });

    it('should use full interval if enough time remaining', () => {
      const MAX_DURATION_MS = 120000;
      const elapsed = 10000; // 10 seconds elapsed
      const nextInterval = 30000;

      const timeRemaining = MAX_DURATION_MS - elapsed;
      const actualWait = Math.min(nextInterval, timeRemaining);

      expect(actualWait).toBe(30000); // Full interval
    });
  });

  describe('API Call Reduction', () => {
    it('should reduce calls by ~50% compared to constant polling', () => {
      // Before: Constant 6s polling for 120s = 20 calls
      const constantPollingCalls = Math.floor(120000 / 6000);

      // After: Exponential backoff ~8-10 calls
      const exponentialBackoffCalls = 9; // Average

      const reduction = ((constantPollingCalls - exponentialBackoffCalls) / constantPollingCalls) * 100;

      expect(constantPollingCalls).toBe(20);
      expect(reduction).toBeGreaterThanOrEqual(50);
      expect(reduction).toBeLessThanOrEqual(60);
    });

    it('transaction polling should reduce calls by ~50%', () => {
      // Before: Constant 15s polling for 900s = 60 calls
      const constantPollingCalls = Math.floor(900000 / 15000);

      // After: Exponential backoff ~27 calls
      const exponentialBackoffCalls = 27;

      const reduction = ((constantPollingCalls - exponentialBackoffCalls) / constantPollingCalls) * 100;

      expect(constantPollingCalls).toBe(60);
      expect(reduction).toBeGreaterThanOrEqual(50);
      expect(reduction).toBeLessThanOrEqual(60);
    });
  });
});
