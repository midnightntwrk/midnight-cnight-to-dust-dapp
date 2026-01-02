/**
 * Environment Variable Validation
 *
 * Centralized validation for all required environment variables.
 * Fails fast at startup with clear error messages.
 */

type CardanoNetwork = 'Mainnet' | 'Preview' | 'Preprod' | 'Emulator' | 'Custom';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that a string environment variable exists and is not empty
 */
function validateRequiredEnv(name: string, value: string | undefined): string | null {
  if (!value || value.trim() === '') {
    return `Missing required environment variable: ${name}`;
  }
  return null;
}

/**
 * Validates that a string is a valid URL
 */
function validateUrl(name: string, value: string): string | null {
  try {
    new URL(value);
    return null;
  } catch {
    return `Invalid URL for environment variable ${name}: ${value}`;
  }
}

/**
 * Validates that a value is one of the allowed options
 */
function validateEnum<T extends string>(name: string, value: string | undefined, allowedValues: readonly T[]): string | null {
  if (!value) {
    return `Missing required environment variable: ${name}`;
  }
  if (!allowedValues.includes(value as T)) {
    return `Invalid value for ${name}: ${value}. Allowed values: ${allowedValues.join(', ')}`;
  }
  return null;
}

/**
 * Validates environment variables for a specific network
 */
function validateNetworkEnv(network: CardanoNetwork): string[] {
  const errors: string[] = [];

  // Validate network-specific Blockfrost key (required on server-side)
  if (typeof window === 'undefined') {
    const blockfrostKeyName = `BLOCKFROST_KEY_${network.toUpperCase()}`;
    const blockfrostKey = process.env[blockfrostKeyName];
    const error = validateRequiredEnv(blockfrostKeyName, blockfrostKey);
    if (error) {
      errors.push(error);
    }
  }

  // Validate cNIGHT currency policy ID
  const policyIdName = `NEXT_PUBLIC_${network.toUpperCase()}_CNIGHT_CURRENCY_POLICY_ID`;
  const policyId = process.env[policyIdName];
  const error = validateRequiredEnv(policyIdName, policyId);
  if (error) {
    errors.push(error);
  }

  // Validate cNIGHT currency encoded name (can be empty string, but must be defined)
  const encodedNameName = `NEXT_PUBLIC_${network.toUpperCase()}_CNIGHT_CURRENCY_ENCODEDNAME`;
  const encodedName = process.env[encodedNameName];
  if (encodedName === undefined) {
    errors.push(`Missing required environment variable: ${encodedNameName}`);
  }

  return errors;
}

/**
 * Validates all required environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];

  // Validate network selection
  const cardanoNet = process.env.NEXT_PUBLIC_CARDANO_NET;
  const networkError = validateEnum('NEXT_PUBLIC_CARDANO_NET', cardanoNet, ['Mainnet', 'Preview', 'Preprod', 'Emulator', 'Custom'] as const);
  if (networkError) {
    errors.push(networkError);
    // If network is invalid, we can't continue with network-specific validation
    return { isValid: false, errors };
  }

  const network = cardanoNet as CardanoNetwork;

  // Validate network-specific variables
  const networkErrors = validateNetworkEnv(network);
  errors.push(...networkErrors);

  // Validate INDEXER_ENDPOINT if it's used (optional, but if set, must be valid URL)
  const indexerEndpoint = process.env.INDEXER_ENDPOINT;
  if (indexerEndpoint) {
    const urlError = validateUrl('INDEXER_ENDPOINT', indexerEndpoint);
    if (urlError) {
      errors.push(urlError);
    }
  }

  // Validate server API URL if set (optional, but if set, must be valid URL)
  const serverApiUrl = process.env.NEXT_PUBLIC_REACT_SERVER_API_URL;
  if (serverApiUrl) {
    // Allow relative URLs (starting with /) or full URLs
    if (!serverApiUrl.startsWith('/') && !serverApiUrl.startsWith('http')) {
      errors.push(`Invalid URL format for NEXT_PUBLIC_REACT_SERVER_API_URL: ${serverApiUrl}. Must be a full URL or start with /`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates and throws if validation fails
 * Call this at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (!result.isValid) {
    const errorMessage = [
      '❌ Environment variable validation failed:',
      '',
      ...result.errors.map((error, index) => `  ${index + 1}. ${error}`),
      '',
      'Please check your .env.local file and ensure all required variables are set.',
      `Current network: ${process.env.NEXT_PUBLIC_CARDANO_NET || 'NOT SET'}`,
    ].join('\n');

    throw new Error(errorMessage);
  }
}
