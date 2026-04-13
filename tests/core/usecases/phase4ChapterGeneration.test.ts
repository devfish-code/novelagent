/**
 * Phase4章节生成单元测试
 * 
 * Requirements: 4.9-4.19, 10.1-10.9
 */

import { describe, it, expect } from 'vitest';
import { phase4ChapterGeneration, buildFixPrompt } from '../../../src/core/usecases/phase4ChapterGeneration';
import type { Phase4Input } from '../../../src/core/usecases/phase4ChapterGeneration';
import type { Project } from '../../../src/core/models/project';
import type { Chapter } from '../../../src/core/models/chapter';
import type { Violation } from '../../../src/core/rules';

describe('phase4ChapterGeneration', () => {
  const mockProject: Project = {
    projectName: 'test-novel',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: '1.0.0',
    config: {
      volumes: 3,
      chaptersPerVolume: 10,
      wordsPerChapter: 3000,
    },
    progress: {
      currentPhase: 'phase4',
      completedChapters: 0,
      totalChapters: 30,
    },
    chapters: [],
    statistics: {
      totalWords: 0,
      totalAICalls: 0,
      totalTokens: 0,
      totalFixRounds: 0,
    },
    status: 'generating',
  };

  it('应该执行完整的章节生成流程', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 1,
        chapter: 1,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    expect(output.chapter).toBeDefined();
    expect(output.updatedWorldState).toBeDefined();
    expect(output.validationResults).toBeDefined();
    expect(output.fixRounds).toBeDefined();
    expect(output.effects).toBeDefined();
  });

  it('应该返回AI_CHAT Effect声明用于生成初稿', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 1,
        chapter: 1,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    expect(aiChatEffects.length).toBeGreaterThanOrEqual(3); // 初稿、状态提取、润色
    
    // 验证初稿生成Effect
    const draftEffect = aiChatEffects.find(
      (e) => e.payload.messages[0].content.includes('小说作家')
    );
    expect(draftEffect).toBeDefined();
    expect(draftEffect?.payload.model).toBe('main');
  });

  it('应该返回AI_CHAT Effect声明用于提取状态变化', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 1,
        chapter: 2,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证状态提取Effect
    const stateExtractionEffect = aiChatEffects.find(
      (e) => e.payload.messages[0].content.includes('小说编辑')
    );
    expect(stateExtractionEffect).toBeDefined();
    expect(stateExtractionEffect?.payload.model).toBe('json');
  });

  it('应该返回AI_CHAT Effect声明用于风格润色', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 2,
        chapter: 5,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证润色Effect
    const polishEffect = aiChatEffects.find(
      (e) => e.payload.messages[1].content.includes('风格润色')
    );
    expect(polishEffect).toBeDefined();
    expect(polishEffect?.payload.model).toBe('main');
  });

  it('应该返回SAVE_FILE Effect声明用于保存章节', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 1,
        chapter: 3,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    const saveFileEffect = output.effects.find((e) => e.type === 'SAVE_FILE');
    expect(saveFileEffect).toBeDefined();
    expect(saveFileEffect?.payload.path).toBe('test-novel/chapters/vol-1-ch-003.md');
  });

  it('应该返回LOG_INFO Effect声明', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 1,
        chapter: 1,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    const logEffects = output.effects.filter((e) => e.type === 'LOG_INFO');
    expect(logEffects.length).toBeGreaterThan(0);
    
    const completionLog = logEffects.find((e) => e.payload.message.includes('章节生成完成'));
    expect(completionLog).toBeDefined();
  });

  it('应该初始化章节对象', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 2,
        chapter: 8,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    expect(output.chapter.volume).toBe(2);
    expect(output.chapter.chapter).toBe(8);
    expect(output.chapter.generatedAt).toBeDefined();
  });

  it('应该更新世界状态的lastUpdatedChapter', () => {
    // Arrange
    const input: Phase4Input = {
      chapterMeta: {
        volume: 3,
        chapter: 10,
      },
      project: mockProject,
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase4ChapterGeneration(input);

    // Assert
    expect(output.updatedWorldState.lastUpdatedChapter).toBe('vol-3-ch-010');
  });
});

describe('buildFixPrompt', () => {
  it('应该构建包含违规信息的修复提示词', () => {
    // Arrange
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '第一章',
      content: '张三突然出现在北京...',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const violations: Violation[] = [
      {
        type: 'SPACETIME',
        severity: 'critical',
        message: '角色无法在该时间到达该地点',
        location: '第3段',
        suggestedFix: '调整时间线或角色移动方式',
      },
      {
        type: 'CHARACTER_BEHAVIOR',
        severity: 'warning',
        message: '角色行为不符合性格设定',
        location: '第5段',
      },
    ];

    // Act
    const prompt = buildFixPrompt(chapter, violations);

    // Assert
    expect(prompt).toContain('修复以下章节中的一致性问题');
    expect(prompt).toContain('张三突然出现在北京');
    expect(prompt).toContain('[SPACETIME]');
    expect(prompt).toContain('角色无法在该时间到达该地点');
    expect(prompt).toContain('[CHARACTER_BEHAVIOR]');
    expect(prompt).toContain('调整时间线或角色移动方式');
  });

  it('应该处理没有建议修复方案的违规', () => {
    // Arrange
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '第一章',
      content: '测试内容',
      wordCount: 50,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const violations: Violation[] = [
      {
        type: 'WORLD_RULE',
        severity: 'critical',
        message: '违反了魔法系统规则',
      },
    ];

    // Act
    const prompt = buildFixPrompt(chapter, violations);

    // Assert
    expect(prompt).toContain('[WORLD_RULE]');
    expect(prompt).toContain('违反了魔法系统规则');
    expect(prompt).not.toContain('建议:');
  });
});
