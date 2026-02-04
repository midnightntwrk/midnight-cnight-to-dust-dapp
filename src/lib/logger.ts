/**
 * Logger utility with environment-based controls
 *
 * In production, only error/warn logs are shown by default.
 * In development, all logs are shown.
 * Set LOG_LEVEL=debug to enable all logs in production.
 *
 * Usage:
 * - logger.log('[Module]', 'Message') - Development or LOG_LEVEL=debug
 * - logger.error('[Module]', 'Error message') - Always shown
 * - logger.warn('[Module]', 'Warning message') - Always shown
 * - logger.info('[Module]', 'Info message') - Development or LOG_LEVEL=debug/info
 * - logger.debug('[Module]', 'Debug message') - Development with DEBUG=true, or LOG_LEVEL=debug
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /authorization/i,
  /credential/i,
];

// Fields to partially mask (show first/last few chars)
const PARTIAL_MASK_FIELDS = ['address', 'rewardAddress', 'dustAddress', 'cardanoRewardAddress'];

/**
 * Sanitize a value for logging
 */
const sanitizeValue = (key: string, value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  // Full redaction for sensitive fields
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
    return '[REDACTED]';
  }

  // Partial masking for address fields (show first 10 and last 4 chars)
  if (PARTIAL_MASK_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
    if (value.length > 20) {
      return `${value.substring(0, 10)}...${value.substring(value.length - 4)}`;
    }
  }

  return value;
};

/**
 * Recursively sanitize an object for logging
 */
const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = typeof value === 'object' ? sanitizeObject(value) : sanitizeValue(key, value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize log arguments
 */
const sanitizeArgs = (args: unknown[]): unknown[] => {
  return args.map((arg) => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }
    return arg;
  });
};

// Check LOG_LEVEL env var (works at runtime for server-side code)
const getLogLevel = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: read from process.env at runtime
    return process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'warn');
  }
  // Client-side: use build-time value or default
  return isDevelopment ? 'debug' : 'warn';
};

const shouldLog = (level: 'debug' | 'info' | 'log' | 'warn' | 'error'): boolean => {
  const logLevel = getLogLevel();
  const levels = ['debug', 'info', 'log', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(logLevel);
  const targetLevelIndex = levels.indexOf(level);
  return targetLevelIndex >= currentLevelIndex;
};

class Logger {
  /**
   * Log messages (development or LOG_LEVEL=log/info/debug)
   */
  log(...args: unknown[]): void {
    if (shouldLog('log')) {
      console.log(...sanitizeArgs(args));
    }
  }

  /**
   * Error messages (always shown)
   */
  error(...args: unknown[]): void {
    console.error(...sanitizeArgs(args));
  }

  /**
   * Warning messages (always shown unless LOG_LEVEL=error)
   */
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(...sanitizeArgs(args));
    }
  }

  /**
   * Info messages (development or LOG_LEVEL=info/debug)
   */
  info(...args: unknown[]): void {
    if (shouldLog('info')) {
      console.info(...sanitizeArgs(args));
    }
  }

  /**
   * Debug messages (development or LOG_LEVEL=debug)
   */
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(...sanitizeArgs(args));
    }
  }
}

export const logger = new Logger();
