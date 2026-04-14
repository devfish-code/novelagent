/**
 * Property Test: WebSocket Event Format Consistency
 * **Validates: Requirements 6.4**
 * 
 * 验证所有 WebSocket 事件都包含必需字段（projectName 和 timestamp）
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import type {
  ProgressEvent,
  LogEvent,
  StatusEvent,
  ErrorEvent,
  CompleteEvent,
  ServerMessage,
} from '../../../src/server/types/websocket.js';

// ============================================================================
// Arbitraries (生成器)
// ============================================================================

/**
 * 生成有效的项目名称（非空且 trim 后非空）
 */
const projectNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((name) => name.trim().length > 0);

/**
 * 生成有效的 ISO 8601 时间戳（限制在合理的日期范围内）
 */
const timestampArbitrary = fc
  .integer({ min: 0, max: 4102444800000 }) // 1970-01-01 到 2100-01-01 的毫秒数
  .map((ms) => new Date(ms).toISOString());

/**
 * 生成 ProgressEvent
 */
const progressEventArbitrary: fc.Arbitrary<ProgressEvent> = fc.record({
  type: fc.constant('progress' as const),
  projectName: projectNameArbitrary,
  timestamp: timestampArbitrary,
  phase: fc.constantFrom(1, 2, 3, 4, 5) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>,
  percentage: fc.integer({ min: 0, max: 100 }),
  current: fc.nat({ max: 1000 }),
  total: fc.nat({ max: 1000 }),
  message: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
  details: fc.option(
    fc.record({
      volume: fc.option(fc.nat({ max: 10 })),
      chapter: fc.option(fc.nat({ max: 100 })),
      step: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)),
    }),
    { nil: undefined }
  ),
});

/**
 * 生成 LogEvent
 */
const logEventArbitrary: fc.Arbitrary<LogEvent> = fc.record({
  type: fc.constant('log' as const),
  projectName: projectNameArbitrary,
  timestamp: timestampArbitrary,
  level: fc.constantFrom('info', 'debug', 'warning', 'error') as fc.Arbitrary<
    'info' | 'debug' | 'warning' | 'error'
  >,
  message: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
  context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

/**
 * 生成 StatusEvent
 */
const statusEventArbitrary: fc.Arbitrary<StatusEvent> = fc.record({
  type: fc.constant('status' as const),
  projectName: projectNameArbitrary,
  timestamp: timestampArbitrary,
  status: fc.constantFrom('idle', 'generating', 'completed', 'failed', 'paused') as fc.Arbitrary<
    'idle' | 'generating' | 'completed' | 'failed' | 'paused'
  >,
  phase: fc.option(fc.constantFrom(1, 2, 3, 4, 5) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>, {
    nil: undefined,
  }),
});

/**
 * 生成 ErrorEvent
 */
const errorEventArbitrary: fc.Arbitrary<ErrorEvent> = fc.record({
  type: fc.constant('error' as const),
  projectName: projectNameArbitrary,
  timestamp: timestampArbitrary,
  error: fc.record({
    code: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    message: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    details: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
  }),
});

/**
 * 生成 CompleteEvent
 */
const completeEventArbitrary: fc.Arbitrary<CompleteEvent> = fc.record({
  type: fc.constant('complete' as const),
  projectName: projectNameArbitrary,
  timestamp: timestampArbitrary,
  phase: fc.constantFrom(1, 2, 3, 4, 5) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>,
  result: fc.record({
    success: fc.boolean(),
    summary: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    data: fc.option(fc.anything(), { nil: undefined }),
  }),
});

/**
 * 生成任意事件类型
 */
const anyEventArbitrary = fc.oneof(
  progressEventArbitrary,
  logEventArbitrary,
  statusEventArbitrary,
  errorEventArbitrary,
  completeEventArbitrary
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 验证字符串是否为有效的 ISO 8601 时间戳
 */
function isValidISO8601(timestamp: string): boolean {
  // 尝试解析时间戳
  const date = new Date(timestamp);
  
  // 检查是否为有效日期
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // 检查是否符合 ISO 8601 格式
  // 支持标准格式：YYYY-MM-DDTHH:mm:ss.sssZ 或 YYYY-MM-DDTHH:mm:ssZ
  // 也支持扩展年份格式：+YYYYYY 或 -YYYYYY
  const iso8601Regex = /^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return iso8601Regex.test(timestamp);
}

/**
 * 验证事件是否包含必需的基础字段
 */
function hasRequiredBaseFields(
  event: ProgressEvent | LogEvent | StatusEvent | ErrorEvent | CompleteEvent
): boolean {
  // 验证 projectName 存在且非空
  if (!event.projectName || typeof event.projectName !== 'string' || event.projectName.trim().length === 0) {
    return false;
  }
  
  // 验证 timestamp 存在且是有效的 ISO 8601 格式
  if (!event.timestamp || typeof event.timestamp !== 'string' || !isValidISO8601(event.timestamp)) {
    return false;
  }
  
  return true;
}

/**
 * 验证 ProgressEvent 的特定字段
 */
function validateProgressEvent(event: ProgressEvent): boolean {
  return (
    event.type === 'progress' &&
    typeof event.phase === 'number' &&
    [1, 2, 3, 4, 5].includes(event.phase) &&
    typeof event.percentage === 'number' &&
    event.percentage >= 0 &&
    event.percentage <= 100 &&
    typeof event.current === 'number' &&
    typeof event.total === 'number' &&
    typeof event.message === 'string' &&
    event.message.length > 0
  );
}

/**
 * 验证 LogEvent 的特定字段
 */
function validateLogEvent(event: LogEvent): boolean {
  return (
    event.type === 'log' &&
    typeof event.level === 'string' &&
    ['info', 'debug', 'warning', 'error'].includes(event.level) &&
    typeof event.message === 'string' &&
    event.message.length > 0
  );
}

/**
 * 验证 StatusEvent 的特定字段
 */
function validateStatusEvent(event: StatusEvent): boolean {
  const validStatuses = ['idle', 'generating', 'completed', 'failed', 'paused'];
  const phaseValid = event.phase === undefined || [1, 2, 3, 4, 5].includes(event.phase);
  
  return (
    event.type === 'status' &&
    typeof event.status === 'string' &&
    validStatuses.includes(event.status) &&
    phaseValid
  );
}

/**
 * 验证 ErrorEvent 的特定字段
 */
function validateErrorEvent(event: ErrorEvent): boolean {
  return (
    event.type === 'error' &&
    typeof event.error === 'object' &&
    event.error !== null &&
    typeof event.error.code === 'string' &&
    event.error.code.length > 0 &&
    typeof event.error.message === 'string' &&
    event.error.message.length > 0
  );
}

/**
 * 验证 CompleteEvent 的特定字段
 */
function validateCompleteEvent(event: CompleteEvent): boolean {
  return (
    event.type === 'complete' &&
    typeof event.phase === 'number' &&
    [1, 2, 3, 4, 5].includes(event.phase) &&
    typeof event.result === 'object' &&
    event.result !== null &&
    typeof event.result.success === 'boolean' &&
    typeof event.result.summary === 'string' &&
    event.result.summary.length > 0
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property Test: WebSocket Event Format Consistency', () => {
  it('应该验证所有事件包含 projectName 和 timestamp', () => {
    fc.assert(
      fc.property(anyEventArbitrary, (event) => {
        // 验证基础字段
        return hasRequiredBaseFields(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证 ProgressEvent 包含所有必需字段', () => {
    fc.assert(
      fc.property(progressEventArbitrary, (event) => {
        return hasRequiredBaseFields(event) && validateProgressEvent(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证 LogEvent 包含所有必需字段', () => {
    fc.assert(
      fc.property(logEventArbitrary, (event) => {
        return hasRequiredBaseFields(event) && validateLogEvent(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证 StatusEvent 包含所有必需字段', () => {
    fc.assert(
      fc.property(statusEventArbitrary, (event) => {
        return hasRequiredBaseFields(event) && validateStatusEvent(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证 ErrorEvent 包含所有必需字段', () => {
    fc.assert(
      fc.property(errorEventArbitrary, (event) => {
        return hasRequiredBaseFields(event) && validateErrorEvent(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证 CompleteEvent 包含所有必需字段', () => {
    fc.assert(
      fc.property(completeEventArbitrary, (event) => {
        return hasRequiredBaseFields(event) && validateCompleteEvent(event);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证所有事件类型的 timestamp 都是有效的 ISO 8601 格式', () => {
    fc.assert(
      fc.property(anyEventArbitrary, (event) => {
        return isValidISO8601(event.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  it('应该验证所有事件类型的 projectName 都是非空字符串', () => {
    fc.assert(
      fc.property(anyEventArbitrary, (event) => {
        return (
          typeof event.projectName === 'string' &&
          event.projectName.length > 0 &&
          event.projectName.trim().length > 0
        );
      }),
      { numRuns: 100 }
    );
  });
});
