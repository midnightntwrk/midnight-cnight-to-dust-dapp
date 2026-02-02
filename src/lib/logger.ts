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
      console.log(...args);
    }
  }

  /**
   * Error messages (always shown)
   */
  error(...args: unknown[]): void {
    console.error(...args);
  }

  /**
   * Warning messages (always shown unless LOG_LEVEL=error)
   */
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  }

  /**
   * Info messages (development or LOG_LEVEL=info/debug)
   */
  info(...args: unknown[]): void {
    if (shouldLog('info')) {
      console.info(...args);
    }
  }

  /**
   * Debug messages (development or LOG_LEVEL=debug)
   */
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger();
