import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the logger module fresh each time
describe('Logger', () => {
  const originalEnv = { ...process.env };
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('should always output error messages', async () => {
    process.env.NODE_ENV = 'production';
    const { logger } = await import('../logger');

    logger.error('test error');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should sanitize sensitive fields in logged objects', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');

    logger.error('[Test]', { password: 'secret123', name: 'test' });

    const call = consoleSpy.error.mock.calls[0];
    const sanitized = call[1] as Record<string, unknown>;
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.name).toBe('test');
  });

  it('should redact api_key, token, secret, private_key, authorization, credential fields', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');

    logger.error('[Test]', {
      api_key: 'abc',
      token: 'xyz',
      secret: '123',
      privateKey: 'pk',
      authorization: 'Bearer xxx',
      credential: 'cred',
    });

    const call = consoleSpy.error.mock.calls[0];
    const sanitized = call[1] as Record<string, unknown>;
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.privateKey).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.credential).toBe('[REDACTED]');
  });

  it('should partially mask address fields', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');

    const longAddress = 'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';
    logger.error('[Test]', { address: longAddress });

    const call = consoleSpy.error.mock.calls[0];
    const sanitized = call[1] as Record<string, unknown>;
    expect(sanitized.address).toContain('...');
    expect((sanitized.address as string).length).toBeLessThan(longAddress.length);
  });

  it('should suppress debug messages when LOG_LEVEL is warn', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'warn';
    const { logger } = await import('../logger');

    logger.debug('should not appear');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
  });
});
