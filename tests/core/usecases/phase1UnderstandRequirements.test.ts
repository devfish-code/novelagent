/**
 * Phase1需求理解单元测试
 * 
 * Requirements: 3.1
 */

import { describe, it, expect } from 'vitest';
import { phase1UnderstandRequirements } from '../../../src/core/usecases/phase1UnderstandRequirements';
import type { Phase1Input } from '../../../src/core/usecases/phase1UnderstandRequirements';

describe('phase1UnderstandRequirements', () => {
  it('应该从创意描述生成结构化需求', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个关于时间旅行的科幻故事,主角是一位物理学家,发现了穿越时空的方法',
      projectName: 'time-travel-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert
    expect(output.requirements).toBeDefined();
    expect(output.requirements.expectedLength.totalWords).toBe(90000); // 3 * 10 * 3000
    expect(output.requirements.expectedLength.chapters).toBe(30); // 3 * 10
    expect(output.requirements.metadata.generatedAt).toBeDefined();
    expect(output.requirements.metadata.novelAgentVersion).toBe('1.0.0');
  });

  it('应该返回AI_CHAT Effect声明', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个魔法学院的故事',
      projectName: 'magic-school',
      config: {
        volumes: 2,
        chaptersPerVolume: 5,
        wordsPerChapter: 2000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert
    const aiChatEffect = output.effects.find((e) => e.type === 'AI_CHAT');
    expect(aiChatEffect).toBeDefined();
    expect(aiChatEffect?.payload.model).toBe('main');
    expect(aiChatEffect?.payload.messages).toHaveLength(2);
    expect(aiChatEffect?.payload.messages[0].role).toBe('system');
    expect(aiChatEffect?.payload.messages[1].role).toBe('user');
  });

  it('应该返回SAVE_FILE Effect声明', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个武侠故事',
      projectName: 'wuxia-novel',
      config: {
        volumes: 1,
        chaptersPerVolume: 20,
        wordsPerChapter: 2500,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert
    const saveFileEffect = output.effects.find((e) => e.type === 'SAVE_FILE');
    expect(saveFileEffect).toBeDefined();
    expect(saveFileEffect?.payload.path).toBe('wuxia-novel/requirements.md');
    expect(saveFileEffect?.payload.content).toContain('novelType:');
    expect(saveFileEffect?.payload.content).toContain('targetAudience:');
    expect(saveFileEffect?.payload.content).toContain('coreConflict:');
  });

  it('应该返回LOG_INFO Effect声明', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个都市言情故事',
      projectName: 'romance-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 15,
        wordsPerChapter: 3500,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert
    const logEffect = output.effects.find((e) => e.type === 'LOG_INFO');
    expect(logEffect).toBeDefined();
    expect(logEffect?.payload.message).toContain('Phase1需求理解完成');
  });

  it('应该根据配置计算正确的预期篇幅', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个悬疑推理故事',
      projectName: 'mystery-novel',
      config: {
        volumes: 4,
        chaptersPerVolume: 8,
        wordsPerChapter: 4000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert
    expect(output.requirements.expectedLength.totalWords).toBe(128000); // 4 * 8 * 4000
    expect(output.requirements.expectedLength.chapters).toBe(32); // 4 * 8
  });

  it('应该生成包含所有必需字段的需求对象', () => {
    // Arrange
    const input: Phase1Input = {
      creativeDescription: '一个奇幻冒险故事',
      projectName: 'fantasy-adventure',
      config: {
        volumes: 3,
        chaptersPerVolume: 12,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase1UnderstandRequirements(input);

    // Assert - 验证所有必需字段存在
    expect(output.requirements).toHaveProperty('novelType');
    expect(output.requirements).toHaveProperty('targetAudience');
    expect(output.requirements.targetAudience).toHaveProperty('ageRange');
    expect(output.requirements.targetAudience).toHaveProperty('readingPreferences');
    expect(output.requirements).toHaveProperty('coreConflict');
    expect(output.requirements.coreConflict).toHaveProperty('mainContradiction');
    expect(output.requirements.coreConflict).toHaveProperty('opposingSides');
    expect(output.requirements).toHaveProperty('theme');
    expect(output.requirements).toHaveProperty('emotionalTone');
    expect(output.requirements).toHaveProperty('storyBackground');
    expect(output.requirements.storyBackground).toHaveProperty('era');
    expect(output.requirements.storyBackground).toHaveProperty('region');
    expect(output.requirements.storyBackground).toHaveProperty('socialEnvironment');
    expect(output.requirements).toHaveProperty('narrativePerspective');
    expect(output.requirements).toHaveProperty('expectedLength');
    expect(output.requirements).toHaveProperty('uniqueSellingPoints');
    expect(output.requirements).toHaveProperty('metadata');
  });
});
