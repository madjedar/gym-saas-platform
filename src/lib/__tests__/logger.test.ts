import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info outputs valid JSON to console.log', () => {
    logger.info('TEST_EVENT', { gymId: 'gym_123' });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.event).toBe('TEST_EVENT');
    expect(output.gymId).toBe('gym_123');
    expect(output.ts).toBeDefined();
  });

  it('logger.warn outputs valid JSON to console.log', () => {
    logger.warn('WARN_EVENT');
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output.level).toBe('warn');
    expect(output.event).toBe('WARN_EVENT');
  });

  it('logger.error outputs to console.error', () => {
    logger.error('ERROR_EVENT', new Error('test error'));
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
    expect(output.event).toBe('ERROR_EVENT');
    expect(output.message).toBe('test error');
  });

  it('logger.error omits stack trace in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    logger.error('ERROR_EVENT', new Error('prod error'));
    const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(output.stack).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it('logger.security outputs to console.error', () => {
    logger.security('RATE_LIMIT_HIT', { ip: '1.2.3.4', path: '/api/login' });
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(output.level).toBe('security');
    expect(output.ip).toBe('1.2.3.4');
  });

  it('every log entry contains a valid ISO timestamp', () => {
    logger.info('TS_TEST');
    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(new Date(output.ts).toISOString()).toBe(output.ts);
  });
});
