import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithExponentialBackoff } from '../../src/utils/retry';

describe('retryWithExponentialBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该在第一次尝试成功时立即返回结果', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithExponentialBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应该在失败后重试并最终成功', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1 failed'))
      .mockRejectedValueOnce(new Error('Attempt 2 failed'))
      .mockResolvedValue('success');

    const promise = retryWithExponentialBackoff(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('应该在所有重试失败后抛出最后一次的错误', async () => {
    const lastError = new Error('Final attempt failed');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1 failed'))
      .mockRejectedValueOnce(new Error('Attempt 2 failed'))
      .mockRejectedValue(lastError);

    const promise = retryWithExponentialBackoff(fn, { maxRetries: 2 });
    
    // 使用 Promise.allSettled 来避免未处理的 rejection 警告
    const [timerResult, testResult] = await Promise.allSettled([
      vi.runAllTimersAsync(),
      promise
    ]);

    expect(testResult.status).toBe('rejected');
    if (testResult.status === 'rejected') {
      expect(testResult.reason.message).toBe('Final attempt failed');
    }
    expect(fn).toHaveBeenCalledTimes(3); // 初始尝试 + 2次重试
  });

  it('应该使用指数退避策略(1秒、2秒、4秒)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockRejectedValueOnce(new Error('Attempt 3'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(callback, 0);
    }) as any);

    const promise = retryWithExponentialBackoff(fn, {
      maxRetries: 3,
      initialDelay: 1000,
      enableJitter: false, // 禁用抖动以便精确测试
    });
    await vi.runAllTimersAsync();
    await promise;

    // 验证延迟时间: 1000ms, 2000ms, 4000ms
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
  });

  it('应该应用最大延迟限制', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(callback, 0);
    }) as any);

    const promise = retryWithExponentialBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 1500, // 限制最大延迟为1500ms
      enableJitter: false,
    });
    await vi.runAllTimersAsync();
    await promise;

    // 第一次延迟: 1000ms (未超过限制)
    // 第二次延迟: 2000ms -> 限制为1500ms
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(1500);
  });

  it('应该应用随机抖动(±25%)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(callback, 0);
    }) as any);

    const promise = retryWithExponentialBackoff(fn, {
      maxRetries: 1,
      initialDelay: 1000,
      enableJitter: true,
    });
    await vi.runAllTimersAsync();
    await promise;

    // 验证延迟在 750ms - 1250ms 范围内 (1000ms ± 25%)
    expect(delays[0]).toBeGreaterThanOrEqual(750);
    expect(delays[0]).toBeLessThanOrEqual(1250);
  });

  it('应该支持自定义退避倍数', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(callback, 0);
    }) as any);

    const promise = retryWithExponentialBackoff(fn, {
      maxRetries: 2,
      initialDelay: 1000,
      backoffMultiplier: 3, // 使用3倍退避
      enableJitter: false,
    });
    await vi.runAllTimersAsync();
    await promise;

    // 验证延迟时间: 1000ms, 3000ms (3倍退避)
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(3000);
  });

  it('应该处理非Error类型的异常', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce('string error')
      .mockRejectedValueOnce(42)
      .mockRejectedValue({ message: 'object error' });

    const promise = retryWithExponentialBackoff(fn, { maxRetries: 2 });
    
    const [timerResult, testResult] = await Promise.allSettled([
      vi.runAllTimersAsync(),
      promise
    ]);

    expect(testResult.status).toBe('rejected');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('应该支持maxRetries为0(不重试)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed'));

    const promise = retryWithExponentialBackoff(fn, { maxRetries: 0 });
    
    const [timerResult, testResult] = await Promise.allSettled([
      vi.runAllTimersAsync(),
      promise
    ]);

    expect(testResult.status).toBe('rejected');
    if (testResult.status === 'rejected') {
      expect(testResult.reason.message).toBe('Failed');
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应该符合需求12.5的重试序列(1秒、2秒、4秒、8秒)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockRejectedValueOnce(new Error('Network error 3'))
      .mockRejectedValueOnce(new Error('Network error 4'))
      .mockResolvedValue('success');

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(callback, 0);
    }) as any);

    const promise = retryWithExponentialBackoff(fn, {
      maxRetries: 4,
      initialDelay: 1000,
      backoffMultiplier: 2,
      enableJitter: false,
    });
    await vi.runAllTimersAsync();
    await promise;

    // 验证符合需求12.5: 1秒、2秒、4秒、8秒
    expect(delays[0]).toBe(1000);  // 1秒
    expect(delays[1]).toBe(2000);  // 2秒
    expect(delays[2]).toBe(4000);  // 4秒
    expect(delays[3]).toBe(8000);  // 8秒
  });
});
