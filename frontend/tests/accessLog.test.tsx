import { describe, expect, it, vi } from 'vitest';
import { createViewLogger } from '../src/demo/accessLog';

const MINUTE = 60 * 1000;

describe('patient view log', () => {
  it('logs each patient, once per 10 minutes', () => {
    let time = 0;
    const send = vi.fn().mockResolvedValue({ ok: true });
    const log = createViewLogger(send, () => time);

    log('p1');
    log('p1');
    log('p2');
    expect(send.mock.calls).toEqual([['p1'], ['p2']]);

    time = 9 * MINUTE;
    log('p1');
    expect(send).toHaveBeenCalledTimes(2);

    time = 10 * MINUTE;
    log('p1');
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('tries again on the next open when logging failed', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi.fn().mockRejectedValueOnce(new Error('ออฟไลน์')).mockResolvedValue({ ok: true });
    const log = createViewLogger(send, () => 0);

    log('p1');
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    log('p1');
    expect(send).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
