/**
 * Transaction constants, limits and minimum balance requirements
 */

/**
 * Lovelace amount required to execute the registration transaction
 */
export const LOVELACE_FOR_REGISTRATION = 1586080n;

/**
 * Minimum ADA balance required to execute the registration transaction
 * This includes:
 * - Transaction fee: ~0.5 ADA
 * - Min UTXO requirement: ~1.5 ADA (LOVELACE_FOR_REGISTRATION)
 * - Safety buffer: ~0.5 ADA
 * Total: ~2.5 ADA minimum recommended
 */
export const MIN_ADA_FOR_REGISTRATION = 2.5;

/**
 * Check if a balance (in ADA string format) meets the minimum requirement
 */
export function hasMinimumBalance(balanceADA: string | null): boolean {
  if (!balanceADA) return false;
  const balance = parseFloat(balanceADA);
  return !isNaN(balance) && balance >= MIN_ADA_FOR_REGISTRATION;
}
