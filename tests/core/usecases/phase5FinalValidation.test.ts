/**
 * Phase5全书校验单元测试
 * 
 * Requirements: 4.23, 4.24
 */

import { describe, it, expect } from 'vitest';
import { phase5FinalValidation } from '../../../src/core/usecases/phase5FinalValidation';
import type { Phase5Input } from '../../../src/core/usecases/phase5FinalValidation';
import type { Project } from '../../../src/core/models/project';

describe('phase5FinalValidation', () => {
  const mockProject: Project = {
    projectName: 'test-novel',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    version: '1.0.0',
    config: {
      volumes: 2,
      chaptersPerVolume: 5,
      wordsPerChapter: 3000,
    },
    progress: {
      currentPhase: 'phase5',
      completedChapters: 10,
      totalChapters: 10,
    },
    chapters: [
      {
        volume: 1,
        chapter: 1,
        title: '第一章',
        wordCount: 3200,
        status: 'completed',
        generatedAt: '2024-01-01T10:00:00Z',
        fixRounds: 1,
      },
      {
        volume: 1,
        chapter: 2,
        title: '第二章',
        wordCount: 2800,
        status: 'completed',
        generatedAt: '2024-01-01T10:30:00Z',
        fixRounds: 0,
      },
      {
        volume: 1,
        chapter: 3,
        title: '第三章',
        wordCount: 3100,
        status: 'completed',
        generatedAt: '2024-01-01T11:00:00Z',
        fixRounds: 2,
      },
    ],
    statistics: {
      totalWords: 9100,
      totalAICalls: 30,
      totalTokens: 150000,
      totalFixRounds: 3,
    },
    status: 'completed',
  };

  it('应该生成质量报告', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report).toBeDefined();
    expect(output.report.projectName).toBe('test-novel');
    expect(output.report.generatedAt).toBeDefined();
  });

  it('应该计算章节统计', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.chapterStats.totalChapters).toBe(3);
    expect(output.report.chapterStats.completedChapters).toBe(3);
    expect(output.report.chapterStats.failedChapters).toBe(0);
  });

  it('应该计算字数统计', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.wordStats.totalWords).toBe(9100); // 3200 + 2800 + 3100
    expect(output.report.wordStats.averageWordsPerChapter).toBe(3033); // Math.round(9100 / 3)
    expect(output.report.wordStats.minWords).toBe(2800);
    expect(output.report.wordStats.maxWords).toBe(3200);
  });

  it('应该计算修复循环统计', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.fixStats.totalFixRounds).toBe(3); // 1 + 0 + 2
    expect(output.report.fixStats.averageFixRoundsPerChapter).toBe(1); // Math.round((3 / 3) * 100) / 100
  });

  it('应该计算AI调用统计', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.aiStats.totalCalls).toBe(30);
    expect(output.report.aiStats.totalTokens).toBe(150000);
    expect(output.report.aiStats.averageTokensPerCall).toBe(5000); // Math.round(150000 / 30)
  });

  it('应该计算生成时间信息', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.timeStats.startTime).toBe('2024-01-01T00:00:00Z');
    expect(output.report.timeStats.endTime).toBe('2024-01-01T12:00:00Z');
    expect(output.report.timeStats.totalDuration).toContain('小时');
  });

  it('应该返回SAVE_FILE Effect声明用于保存报告', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    const saveFileEffect = output.effects.find((e) => e.type === 'SAVE_FILE');
    expect(saveFileEffect).toBeDefined();
    expect(saveFileEffect?.payload.path).toBe('test-novel/report.md');
    expect(saveFileEffect?.payload.content).toContain('生成报告');
    expect(saveFileEffect?.payload.content).toContain('章节统计');
    expect(saveFileEffect?.payload.content).toContain('字数统计');
  });

  it('应该返回LOG_INFO Effect声明', () => {
    // Arrange
    const input: Phase5Input = {
      project: mockProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    const logEffects = output.effects.filter((e) => e.type === 'LOG_INFO');
    expect(logEffects.length).toBeGreaterThan(0);
    
    const completionLog = logEffects.find((e) => e.payload.message.includes('Phase5全书校验完成'));
    expect(completionLog).toBeDefined();
  });

  it('应该处理没有完成章节的情况', () => {
    // Arrange
    const emptyProject: Project = {
      ...mockProject,
      chapters: [],
      statistics: {
        totalWords: 0,
        totalAICalls: 0,
        totalTokens: 0,
        totalFixRounds: 0,
      },
    };

    const input: Phase5Input = {
      project: emptyProject,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.chapterStats.totalChapters).toBe(0);
    expect(output.report.chapterStats.completedChapters).toBe(0);
    expect(output.report.wordStats.totalWords).toBe(0);
    expect(output.report.wordStats.averageWordsPerChapter).toBe(0);
  });

  it('应该识别修复失败的章节', () => {
    // Arrange
    const projectWithFailedFix: Project = {
      ...mockProject,
      chapters: [
        {
          volume: 1,
          chapter: 1,
          title: '第一章',
          wordCount: 3000,
          status: 'completed',
          generatedAt: '2024-01-01T10:00:00Z',
          fixRounds: 3, // 达到最大修复次数
        },
        {
          volume: 1,
          chapter: 2,
          title: '第二章',
          wordCount: 3000,
          status: 'completed',
          generatedAt: '2024-01-01T10:30:00Z',
          fixRounds: 1,
        },
      ],
    };

    const input: Phase5Input = {
      project: projectWithFailedFix,
    };

    // Act
    const output = phase5FinalValidation(input);

    // Assert
    expect(output.report.fixStats.failedFixChapters).toContain('vol-1-ch-001');
    expect(output.report.fixStats.failedFixChapters).not.toContain('vol-1-ch-002');
  });
});
