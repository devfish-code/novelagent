/**
 * Effects测试
 */

import { describe, it, expect } from 'vitest';
import { EffectType } from '../../src/core/effects.js';

describe('Effects', () => {
  describe('EffectType', () => {
    it('应该定义所有Effect类型常量', () => {
      expect(EffectType.AI_CHAT).toBe('AI_CHAT');
      expect(EffectType.SAVE_FILE).toBe('SAVE_FILE');
      expect(EffectType.READ_FILE).toBe('READ_FILE');
      expect(EffectType.ENSURE_DIR).toBe('ENSURE_DIR');
      expect(EffectType.LOG_INFO).toBe('LOG_INFO');
      expect(EffectType.LOG_DEBUG).toBe('LOG_DEBUG');
      expect(EffectType.LOG_ERROR).toBe('LOG_ERROR');
      expect(EffectType.SHOW_PROGRESS).toBe('SHOW_PROGRESS');
      expect(EffectType.SHOW_MESSAGE).toBe('SHOW_MESSAGE');
    });

    it('应该包含所有必需的Effect类型', () => {
      const effectTypes = Object.values(EffectType);
      expect(effectTypes).toContain('AI_CHAT');
      expect(effectTypes).toContain('SAVE_FILE');
      expect(effectTypes).toContain('READ_FILE');
      expect(effectTypes).toContain('ENSURE_DIR');
      expect(effectTypes).toContain('LOG_INFO');
      expect(effectTypes).toContain('LOG_DEBUG');
      expect(effectTypes).toContain('LOG_ERROR');
      expect(effectTypes).toContain('SHOW_PROGRESS');
      expect(effectTypes).toContain('SHOW_MESSAGE');
    });
  });
});
