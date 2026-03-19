export const SPECKS_PER_TDUST = 1_000_000_000_000_000n; // 1 tDUST = 10^15 SPECK
export const STARS_PER_NIGHT = 1_000_000n; // 1 NIGHT = 10^6 Stars

/** Add thousand separators to the whole part of a numeric string (only for large numbers) */
const formatWithSeparators = (value: string): string => {
  const [whole, fractional] = value.split('.');
  if (whole.length <= 3) {
    return fractional !== undefined ? `${whole}.${fractional}` : whole;
  }
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fractional !== undefined ? `${formatted}.${fractional}` : formatted;
};

/** Abbreviate large numbers: 1,234 → 1.23K, 1,234,567 → 1.23M, etc. */
const abbreviateNumber = (whole: bigint, fractional: string): string => {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const wholeStr = whole.toString();
  const len = wholeStr.length;

  if (len <= 3) {
    return `${wholeStr}.${fractional}`;
  }

  const suffixIndex = Math.min(Math.floor((len - 1) / 3), suffixes.length - 1);
  const divisor = 10n ** BigInt(suffixIndex * 3);
  const shortened = whole / divisor;
  const remainderPart = whole % divisor;
  // Get 2 decimal digits from the remainder
  const decimalPart = (remainderPart * 100n) / divisor;
  const decimal = decimalPart.toString().padStart(2, '0');

  return `${shortened}.${decimal}${suffixes[suffixIndex]}`;
};

export const specksToTDust = (specksString: string): string => {
  const specks = BigInt(specksString);

  const whole = specks / SPECKS_PER_TDUST;
  const remainder = specks % SPECKS_PER_TDUST;

  // scale remainder to 3 decimal places WITHOUT floats
  const fractional = (remainder * 1000n) / SPECKS_PER_TDUST;

  // If 3 decimal places shows non-zero or value has whole part, use standard format
  if (whole > 0n || fractional > 0n) {
    return abbreviateNumber(whole, fractional.toString().padStart(3, '0'));
  }

  // Value is less than 0.001 tDUST — show significant digits
  if (remainder === 0n) {
    return '0.000';
  }

  const fullFractional = remainder.toString().padStart(15, '0');
  let firstNonZero = 0;
  while (firstNonZero < fullFractional.length && fullFractional[firstNonZero] === '0') {
    firstNonZero++;
  }
  const significantDigits = fullFractional.slice(firstNonZero, firstNonZero + 3);

  return `0.0...${significantDigits}`;
};

/** Convert stars to NIGHT (abbreviated for large numbers) */
export const starsToNight = (starsString: string): string => {
  const stars = BigInt(starsString);
  const whole = stars / STARS_PER_NIGHT;
  const remainder = stars % STARS_PER_NIGHT;

  const fractional = remainder === 0n ? '0' : remainder.toString().padStart(6, '0').replace(/0+$/, '');
  return abbreviateNumber(whole, fractional);
};

/** Convert stars to NIGHT with full precision (for tooltips) */
export const starsToNightFull = (starsString: string): string => {
  const stars = BigInt(starsString);
  const whole = stars / STARS_PER_NIGHT;
  const remainder = stars % STARS_PER_NIGHT;

  if (remainder === 0n) {
    return formatWithSeparators(`${whole}`);
  }

  const fractional = remainder.toString().padStart(6, '0').replace(/0+$/, '');
  return formatWithSeparators(`${whole}.${fractional}`);
};

/** Full-precision conversion (no ellipsis) — use for tooltips */
export const specksToTDustFull = (specksString: string): string => {
  const specks = BigInt(specksString);
  const whole = specks / SPECKS_PER_TDUST;
  const remainder = specks % SPECKS_PER_TDUST;

  if (remainder === 0n) {
    return formatWithSeparators(`${whole}.0`);
  }

  // Full 15-digit fractional, trailing zeros trimmed
  const fullFractional = remainder.toString().padStart(15, '0').replace(/0+$/, '');
  return formatWithSeparators(`${whole}.${fullFractional}`);
};
