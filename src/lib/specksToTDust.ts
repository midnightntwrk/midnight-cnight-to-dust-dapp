export const SPECKS_PER_TDUST = 1_000_000_000_000_000n; // 1 tDUST = 10^15 SPECK

export const specksToTDust = (specksString: string): string => {
  const specks = BigInt(specksString);

  const whole = specks / SPECKS_PER_TDUST;
  const remainder = specks % SPECKS_PER_TDUST;

  // scale remainder to 3 decimal places WITHOUT floats
  const fractional = (remainder * 1000n) / SPECKS_PER_TDUST;

  // If 3 decimal places shows non-zero or value has whole part, use standard format
  if (whole > 0n || fractional > 0n) {
    return `${whole}.${fractional.toString().padStart(3, '0')}`;
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
