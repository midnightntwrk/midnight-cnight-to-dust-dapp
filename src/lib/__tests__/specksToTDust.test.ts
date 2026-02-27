import { describe, it, expect } from 'vitest';
import { specksToTDust, SPECKS_PER_TDUST } from '../specksToTDust';

describe('specksToTDust', () => {
  it('should return "0.000" for zero specks', () => {
    expect(specksToTDust('0')).toBe('0.000');
  });

  it('should return "1.000" for exactly 1 tDUST', () => {
    // 1 tDUST = 10^15 specks
    expect(specksToTDust(SPECKS_PER_TDUST.toString())).toBe('1.000');
  });

  it('should handle 1.5 tDUST', () => {
    const specks = SPECKS_PER_TDUST + SPECKS_PER_TDUST / 2n;
    expect(specksToTDust(specks.toString())).toBe('1.500');
  });

  it('should handle 0.1 tDUST', () => {
    const specks = SPECKS_PER_TDUST / 10n; // 100_000_000_000_000
    expect(specksToTDust(specks.toString())).toBe('0.100');
  });

  it('should handle 0.001 tDUST (boundary)', () => {
    const specks = SPECKS_PER_TDUST / 1000n; // 1_000_000_000_000
    expect(specksToTDust(specks.toString())).toBe('0.001');
  });

  it('should show "0.0...XYZ" format for values below 0.001 tDUST', () => {
    // 0.0001 tDUST = 10^11 specks = 100_000_000_000
    const specks = '100000000000';
    const result = specksToTDust(specks);
    expect(result).toMatch(/^0\.0\.\.\..*$/);
  });

  it('should show significant digits for tiny values', () => {
    // 1 speck — very small value, only 1 significant digit available
    const result = specksToTDust('1');
    expect(result).toBe('0.0...1');
  });

  it('should handle large whole numbers', () => {
    const specks = SPECKS_PER_TDUST * 1000n;
    expect(specksToTDust(specks.toString())).toBe('1000.000');
  });

  it('should handle large whole numbers with fractional parts', () => {
    // 42.123 tDUST
    const whole = SPECKS_PER_TDUST * 42n;
    const fraction = (SPECKS_PER_TDUST * 123n) / 1000n;
    expect(specksToTDust((whole + fraction).toString())).toBe('42.123');
  });

  it('should pad fractional digits to 3 places', () => {
    // 1.001 tDUST
    const specks = SPECKS_PER_TDUST + SPECKS_PER_TDUST / 1000n;
    expect(specksToTDust(specks.toString())).toBe('1.001');
  });

  it('should handle 0.010 tDUST correctly', () => {
    const specks = SPECKS_PER_TDUST / 100n; // 10_000_000_000_000
    expect(specksToTDust(specks.toString())).toBe('0.010');
  });

  it('should export SPECKS_PER_TDUST as 10^15', () => {
    expect(SPECKS_PER_TDUST).toBe(1_000_000_000_000_000n);
  });
});
