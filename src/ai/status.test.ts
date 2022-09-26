import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAIStatus, startHealthCheck, stopHealthCheck } from './status';

describe('AI status module', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    stopHealthCheck();
  });

  afterEach(() => {
    stopHealthCheck();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('getAIStatus returns false initially', () => {
    expect(getAIStatus()).toBe(false);
  });

  it('startHealthCheck sets available to true when AI service responds', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await startHealthCheck();

    expect(getAIStatus()).toBe(true);
  });

  it('startHealthCheck sets available to false when AI service is unreachable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

    await startHealthCheck();

    expect(getAIStatus()).toBe(false);
  });

  it('stopHealthCheck clears the interval', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await startHealthCheck();
    stopHealthCheck();

    // After stopping, further calls to startHealthCheck should work
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    await startHealthCheck();

    expect(getAIStatus()).toBe(false);
  });

  it('calling startHealthCheck multiple times does not create duplicate timers', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await startHealthCheck();
    await startHealthCheck(); // Should be a no-op

    // fetch called only once (the initial check from the first call)
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
