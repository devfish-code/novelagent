/**
 * 重试逻辑工具
 * 实现指数退避重试策略,支持随机抖动和最大延迟限制
 */

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数 (默认: 3) */
  maxRetries?: number;
  /** 初始延迟时间(毫秒) (默认: 1000ms) */
  initialDelay?: number;
  /** 最大延迟时间(毫秒) (默认: 30000ms) */
  maxDelay?: number;
  /** 是否启用随机抖动 (默认: true) */
  enableJitter?: boolean;
  /** 退避倍数 (默认: 2) */
  backoffMultiplier?: number;
}

/**
 * 使用指数退避策略重试函数
 * @param fn 需要重试的异步函数
 * @param options 重试配置选项
 * @returns 函数执行结果
 * @throws 如果所有重试都失败,抛出最后一次的错误
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    enableJitter = true,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最后一次尝试,直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 计算延迟时间: initialDelay * (backoffMultiplier ^ attempt)
      let delay = initialDelay * Math.pow(backoffMultiplier, attempt);

      // 应用最大延迟限制
      delay = Math.min(delay, maxDelay);

      // 应用随机抖动 (±25%)
      if (enableJitter) {
        const jitterRange = delay * 0.25;
        const jitter = Math.random() * jitterRange * 2 - jitterRange;
        delay = Math.max(0, delay + jitter);
      }

      // 等待后重试
      await sleep(delay);
    }
  }

  // TypeScript类型保护,实际上不会执行到这里
  throw lastError!;
}

/**
 * 延迟指定时间
 * @param ms 延迟时间(毫秒)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
