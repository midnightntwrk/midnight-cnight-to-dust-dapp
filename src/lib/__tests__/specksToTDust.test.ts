import { describe, it, expect } from 'vitest';
import { specksToTDust, specksToTDustFull, SPECKS_PER_TDUST, STARS_PER_NIGHT, starsToNight, starsToNightFull } from '../specksToTDust';

describe('specksToTDust', () => {
  it('should return "0.000" for zero specks', () => {
    expect(specksToTDust('0')).toBe('0.000');
  });

  it('should return "1.000" for exactly 1 tDUST', () => {
    expect(specksToTDust(SPECKS_PER_TDUST.toString())).toBe('1.000');
  });

  it('should handle 1.5 tDUST', () => {
    const specks = SPECKS_PER_TDUST + SPECKS_PER_TDUST / 2n;
    expect(specksToTDust(specks.toString())).toBe('1.500');
  });

  it('should handle 0.1 tDUST', () => {
    const specks = SPECKS_PER_TDUST / 10n;
    expect(specksToTDust(specks.toString())).toBe('0.100');
  });

  it('should handle 0.001 tDUST (boundary)', () => {
    const specks = SPECKS_PER_TDUST / 1000n;
    expect(specksToTDust(specks.toString())).toBe('0.001');
  });

  it('should show "0.0...XYZ" format for values below 0.001 tDUST', () => {
    const specks = '100000000000';
    const result = specksToTDust(specks);
    expect(result).toMatch(/^0\.0\.\.\..*$/);
  });

  it('should show significant digits for tiny values', () => {
    const result = specksToTDust('1');
    expect(result).toBe('0.0...1');
  });

  it('should abbreviate large whole numbers with K suffix', () => {
    const specks = SPECKS_PER_TDUST * 1000n;
    expect(specksToTDust(specks.toString())).toBe('1.00K');
  });

  it('should abbreviate very large numbers with M suffix', () => {
    const specks = SPECKS_PER_TDUST * 1_000_000n;
    expect(specksToTDust(specks.toString())).toBe('1.00M');
  });

  it('should not abbreviate numbers under 1000', () => {
    const whole = SPECKS_PER_TDUST * 42n;
    const fraction = (SPECKS_PER_TDUST * 123n) / 1000n;
    expect(specksToTDust((whole + fraction).toString())).toBe('42.123');
  });

  it('should abbreviate 500,000.5 as 500.00K', () => {
    const specks = SPECKS_PER_TDUST * 500000n + SPECKS_PER_TDUST / 2n;
    expect(specksToTDust(specks.toString())).toBe('500.00K');
  });

  it('should round 1,999,999 to 2.00M instead of truncating to 1.99M', () => {
    const specks = SPECKS_PER_TDUST * 1_999_999n;
    expect(specksToTDust(specks.toString())).toBe('2.00M');
  });

  it('should pad fractional digits to 3 places', () => {
    const specks = SPECKS_PER_TDUST + SPECKS_PER_TDUST / 1000n;
    expect(specksToTDust(specks.toString())).toBe('1.001');
  });

  it('should handle 0.010 tDUST correctly', () => {
    const specks = SPECKS_PER_TDUST / 100n;
    expect(specksToTDust(specks.toString())).toBe('0.010');
  });

  it('should export SPECKS_PER_TDUST as 10^15', () => {
    expect(SPECKS_PER_TDUST).toBe(1_000_000_000_000_000n);
  });
});

describe('specksToTDustFull', () => {
  it('should return full precision with thousand separators for large numbers', () => {
    const specks = SPECKS_PER_TDUST * 500000n + SPECKS_PER_TDUST / 2n;
    expect(specksToTDustFull(specks.toString())).toBe('500,000.5');
  });

  it('should return full precision for small numbers without separators', () => {
    const specks = SPECKS_PER_TDUST + SPECKS_PER_TDUST / 2n;
    expect(specksToTDustFull(specks.toString())).toBe('1.5');
  });

  it('should handle zero remainder', () => {
    const specks = SPECKS_PER_TDUST * 42n;
    expect(specksToTDustFull(specks.toString())).toBe('42.0');
  });
});

describe('starsToNight', () => {
  it('should export STARS_PER_NIGHT as 10^6', () => {
    expect(STARS_PER_NIGHT).toBe(1_000_000n);
  });

  it('should convert 0 stars to "0.0"', () => {
    expect(starsToNight('0')).toBe('0.0');
  });

  it('should convert 1,000,000 stars to "1.0"', () => {
    expect(starsToNight('1000000')).toBe('1.0');
  });

  it('should convert 500 stars to "0.0005"', () => {
    expect(starsToNight('500')).toBe('0.0005');
  });

  it('should abbreviate large values (100,000 NIGHT)', () => {
    // 100,000 NIGHT = 100,000,000,000 stars
    expect(starsToNight('100000000000')).toBe('100.00K');
  });

  it('should abbreviate 100,000.1 NIGHT', () => {
    // 100,000,100,000 stars
    expect(starsToNight('100000100000')).toBe('100.00K');
  });

  it('should not abbreviate numbers under 1000 NIGHT', () => {
    // 500 NIGHT = 500,000,000 stars
    expect(starsToNight('500000000')).toBe('500.0');
  });
});

describe('starsToNightFull', () => {
  it('should return full precision with thousand separators', () => {
    expect(starsToNightFull('100000100000')).toBe('100,000.1');
  });

  it('should return without separators for small numbers', () => {
    expect(starsToNightFull('500000000')).toBe('500.0');
  });

  it('should show fractional part trimmed of trailing zeros', () => {
    expect(starsToNightFull('1500000')).toBe('1.5');
  });
});
