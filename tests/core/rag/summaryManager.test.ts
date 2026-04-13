/**
 * 摘要管理器测试
 */

import { describe, it, expect } from 'vitest';
import {
  generateSummary,
  shouldGenerateSummary,
  selectChaptersForContext,
  loadSummaries,
} from '../../../src/core/rag/summaryManager';
import type { SummaryManagerInput } from '../../../src/core/rag/types';
import type { Chapter } from '../../../src/core/models/chapter';

describe('summaryManager', () => {
  describe('generateSummary', () => {
    it('应该生成章节摘要', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary).toBeDefined();
      expect(result.summary.chapterId).toBe('vol-1-ch-005');
      expect(result.summary.wordCount).toBe(3000);
    });

    it('应该在章节号<=3时不生成摘要', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 2),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary.keyEvents).toEqual([]);
      expect(result.summary.characterActions).toEqual({});
      expect(result.summary.stateChanges).toEqual([]);
      expect(result.summary.summaryLength).toBe(0);
      expect(result.effects).toEqual([]);
    });

    it('应该生成AI_CHAT effect', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const aiEffect = result.effects.find((e) => e.type === 'AI_CHAT');
      expect(aiEffect).toBeDefined();
      expect(aiEffect?.payload.model).toBe('json');
      expect(aiEffect?.payload.temperature).toBe(0.3);
    });

    it('应该生成SAVE_FILE effect', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const saveEffect = result.effects.find((e) => e.type === 'SAVE_FILE');
      expect(saveEffect).toBeDefined();
      expect(saveEffect?.payload.path).toContain('chapters/summaries/');
      expect(saveEffect?.payload.path).toContain('vol-1-ch-005-summary.md');
    });

    it('应该生成LOG_INFO effect', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const logEffect = result.effects.find((e) => e.type === 'LOG_INFO');
      expect(logEffect).toBeDefined();
      expect(logEffect?.payload.message).toContain('章节摘要生成完成');
    });

    it('应该使用正确的摘要长度比例', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.2 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const aiEffect = result.effects.find((e) => e.type === 'AI_CHAT');
      expect(aiEffect?.payload.messages[1].content).toContain('20%');
    });

    it('应该包含章节标题和内容在提示词中', () => {
      // Arrange
      const chapter = createMockChapter(1, 5);
      const input: SummaryManagerInput = {
        chapter,
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const aiEffect = result.effects.find((e) => e.type === 'AI_CHAT');
      const prompt = aiEffect?.payload.messages[1].content;
      expect(prompt).toContain(chapter.title);
      expect(prompt).toContain(chapter.content);
    });

    it('应该生成ENSURE_DIR effect确保目录存在', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const ensureDirEffect = result.effects.find(
        (e) => e.type === 'ENSURE_DIR'
      );
      expect(ensureDirEffect).toBeDefined();
      expect(ensureDirEffect?.payload.path).toBe('chapters/summaries');
    });

    it('应该计算正确的摘要长度', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary.summaryLength).toBe(450); // 3000 * 0.15 = 450
    });

    it('应该支持不同的摘要长度比例', () => {
      // Arrange
      const input10: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.1 },
      };
      const input20: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.2 },
      };

      // Act
      const result10 = generateSummary(input10);
      const result20 = generateSummary(input20);

      // Assert
      expect(result10.summary.summaryLength).toBe(300); // 3000 * 0.1
      expect(result20.summary.summaryLength).toBe(600); // 3000 * 0.2
    });

    it('应该生成LOG_DEBUG effect记录开始时间', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const logDebugEffects = result.effects.filter(
        (e) => e.type === 'LOG_DEBUG'
      );
      expect(logDebugEffects.length).toBeGreaterThan(0);
      const startLogEffect = logDebugEffects.find((e) =>
        e.payload.message.includes('开始生成章节摘要')
      );
      expect(startLogEffect).toBeDefined();
      expect(startLogEffect?.payload.context.chapterId).toBe('vol-1-ch-005');
      expect(startLogEffect?.payload.context.wordCount).toBe(3000);
    });

    it('应该在LOG_INFO中记录摘要长度比例', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 5),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      const logEffect = result.effects.find((e) => e.type === 'LOG_INFO');
      expect(logEffect?.payload.context.ratio).toBe(0.15); // 450 / 3000
    });

    it('应该正确格式化章节ID(单数字)', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(2, 3),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary.chapterId).toBe('vol-2-ch-003');
    });

    it('应该正确格式化章节ID(双数字)', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(3, 25),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary.chapterId).toBe('vol-3-ch-025');
    });

    it('应该正确格式化章节ID(三数字)', () => {
      // Arrange
      const input: SummaryManagerInput = {
        chapter: createMockChapter(1, 100),
        config: { summaryLengthRatio: 0.15 },
      };

      // Act
      const result = generateSummary(input);

      // Assert
      expect(result.summary.chapterId).toBe('vol-1-ch-100');
    });
  });

  describe('shouldGenerateSummary', () => {
    it('应该在章节号 <= 3时返回false', () => {
      expect(shouldGenerateSummary(1)).toBe(false);
      expect(shouldGenerateSummary(2)).toBe(false);
      expect(shouldGenerateSummary(3)).toBe(false);
    });

    it('应该在章节号 > 3时返回true', () => {
      expect(shouldGenerateSummary(4)).toBe(true);
      expect(shouldGenerateSummary(5)).toBe(true);
      expect(shouldGenerateSummary(10)).toBe(true);
      expect(shouldGenerateSummary(100)).toBe(true);
    });
  });

  describe('selectChaptersForContext', () => {
    it('应该为第1章返回空列表', () => {
      // Act
      const result = selectChaptersForContext(1, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([]);
      expect(result.summaryChapters).toEqual([]);
    });

    it('应该为第2章返回前1章完整内容', () => {
      // Act
      const result = selectChaptersForContext(2, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([1]);
      expect(result.summaryChapters).toEqual([]);
    });

    it('应该为第3章返回前2章完整内容', () => {
      // Act
      const result = selectChaptersForContext(3, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([1, 2]);
      expect(result.summaryChapters).toEqual([]);
    });

    it('应该为第4章返回前3章完整内容', () => {
      // Act
      const result = selectChaptersForContext(4, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([1, 2, 3]);
      expect(result.summaryChapters).toEqual([]);
    });

    it('应该为第5章返回前3章完整内容和第1章摘要', () => {
      // Act
      const result = selectChaptersForContext(5, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([2, 3, 4]);
      expect(result.summaryChapters).toEqual([1]);
    });

    it('应该为第10章返回前3章完整内容和第4-6章摘要', () => {
      // Act
      const result = selectChaptersForContext(10, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([7, 8, 9]);
      expect(result.summaryChapters).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('应该为第15章返回前3章完整内容和第5-11章摘要', () => {
      // Act
      const result = selectChaptersForContext(15, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([12, 13, 14]);
      expect(result.summaryChapters).toEqual([5, 6, 7, 8, 9, 10, 11]);
    });

    it('应该实现滑动窗口(第20章)', () => {
      // Act
      const result = selectChaptersForContext(20, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([17, 18, 19]);
      expect(result.summaryChapters).toEqual([10, 11, 12, 13, 14, 15, 16]);
      expect(result.summaryChapters.length).toBe(7); // 第4-10章,共7章
    });

    it('应该正确处理边界情况(第11章)', () => {
      // Act
      const result = selectChaptersForContext(11, 30);

      // Assert
      expect(result.fullContentChapters).toEqual([8, 9, 10]);
      expect(result.summaryChapters).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('应该确保摘要窗口不超过7章', () => {
      // Act
      const result = selectChaptersForContext(20, 30);

      // Assert
      expect(result.summaryChapters.length).toBeLessThanOrEqual(7);
    });

    it('应该确保完整内容窗口不超过3章', () => {
      // Act
      const result = selectChaptersForContext(20, 30);

      // Assert
      expect(result.fullContentChapters.length).toBeLessThanOrEqual(3);
    });

    it('应该为第100章正确实现滑动窗口', () => {
      // Act
      const result = selectChaptersForContext(100, 150);

      // Assert
      expect(result.fullContentChapters).toEqual([97, 98, 99]);
      expect(result.summaryChapters).toEqual([90, 91, 92, 93, 94, 95, 96]);
      expect(result.summaryChapters.length).toBe(7);
    });

    it('应该在章节数较少时正确处理', () => {
      // Act
      const result = selectChaptersForContext(6, 10);

      // Assert
      expect(result.fullContentChapters).toEqual([3, 4, 5]);
      expect(result.summaryChapters).toEqual([1, 2]);
    });

    it('应该确保摘要章节和完整内容章节不重叠', () => {
      // Act
      const result = selectChaptersForContext(15, 30);

      // Assert
      const fullSet = new Set(result.fullContentChapters);
      const summarySet = new Set(result.summaryChapters);
      const intersection = [...fullSet].filter((x) => summarySet.has(x));
      expect(intersection).toEqual([]);
    });

    it('应该确保章节号按升序排列', () => {
      // Act
      const result = selectChaptersForContext(20, 30);

      // Assert
      for (let i = 1; i < result.fullContentChapters.length; i++) {
        expect(result.fullContentChapters[i]).toBeGreaterThan(
          result.fullContentChapters[i - 1]
        );
      }
      for (let i = 1; i < result.summaryChapters.length; i++) {
        expect(result.summaryChapters[i]).toBeGreaterThan(
          result.summaryChapters[i - 1]
        );
      }
    });
  });

  describe('loadSummaries', () => {
    it('应该为每个章节ID生成READ_FILE effect', () => {
      // Arrange
      const chapterIds = ['vol-1-ch-001', 'vol-1-ch-002', 'vol-1-ch-003'];

      // Act
      const result = loadSummaries(chapterIds);

      // Assert
      const readEffects = result.effects.filter((e) => e.type === 'READ_FILE');
      expect(readEffects.length).toBe(3);
      expect(readEffects[0].payload.path).toBe(
        'chapters/summaries/vol-1-ch-001-summary.md'
      );
      expect(readEffects[1].payload.path).toBe(
        'chapters/summaries/vol-1-ch-002-summary.md'
      );
      expect(readEffects[2].payload.path).toBe(
        'chapters/summaries/vol-1-ch-003-summary.md'
      );
    });

    it('应该生成LOG_DEBUG effect记录加载信息', () => {
      // Arrange
      const chapterIds = ['vol-1-ch-001', 'vol-1-ch-002'];

      // Act
      const result = loadSummaries(chapterIds);

      // Assert
      const logEffect = result.effects.find((e) => e.type === 'LOG_DEBUG');
      expect(logEffect).toBeDefined();
      expect(logEffect?.payload.message).toContain('加载章节摘要');
      expect(logEffect?.payload.context.chapterIds).toEqual(chapterIds);
      expect(logEffect?.payload.context.count).toBe(2);
    });

    it('应该为每个章节ID创建摘要占位符', () => {
      // Arrange
      const chapterIds = ['vol-1-ch-001', 'vol-1-ch-002'];

      // Act
      const result = loadSummaries(chapterIds);

      // Assert
      expect(result.summaryPlaceholders.length).toBe(2);
      expect(result.summaryPlaceholders[0].chapterId).toBe('vol-1-ch-001');
      expect(result.summaryPlaceholders[1].chapterId).toBe('vol-1-ch-002');
      expect(result.summaryPlaceholders[0].keyEvents).toEqual([]);
      expect(result.summaryPlaceholders[0].characterActions).toEqual({});
    });

    it('应该处理空章节ID列表', () => {
      // Arrange
      const chapterIds: string[] = [];

      // Act
      const result = loadSummaries(chapterIds);

      // Assert
      expect(result.summaryPlaceholders).toEqual([]);
      const readEffects = result.effects.filter((e) => e.type === 'READ_FILE');
      expect(readEffects.length).toBe(0);
    });

    it('应该正确处理单个章节ID', () => {
      // Arrange
      const chapterIds = ['vol-2-ch-015'];

      // Act
      const result = loadSummaries(chapterIds);

      // Assert
      expect(result.summaryPlaceholders.length).toBe(1);
      expect(result.summaryPlaceholders[0].chapterId).toBe('vol-2-ch-015');
      const readEffects = result.effects.filter((e) => e.type === 'READ_FILE');
      expect(readEffects.length).toBe(1);
      expect(readEffects[0].payload.path).toBe(
        'chapters/summaries/vol-2-ch-015-summary.md'
      );
    });
  });
});

/**
 * 创建模拟章节
 */
function createMockChapter(volume: number, chapter: number): Chapter {
  return {
    volume,
    chapter,
    title: `第${chapter}章`,
    content: '这是章节内容。'.repeat(500), // 模拟3000字左右
    wordCount: 3000,
    generatedAt: '2024-01-01T00:00:00Z',
  };
}
