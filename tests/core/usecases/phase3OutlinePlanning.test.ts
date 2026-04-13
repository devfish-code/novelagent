/**
 * Phase3大纲规划单元测试
 * 
 * Requirements: 3.3, 3.11
 */

import { describe, it, expect } from 'vitest';
import { phase3OutlinePlanning } from '../../../src/core/usecases/phase3OutlinePlanning';
import type { Phase3Input } from '../../../src/core/usecases/phase3OutlinePlanning';
import type { Requirements } from '../../../src/core/models/requirements';
import type { WorldState } from '../../../src/core/models/worldState';

describe('phase3OutlinePlanning', () => {
  const mockRequirements: Requirements = {
    novelType: '科幻',
    targetAudience: {
      ageRange: '25-40岁',
      readingPreferences: ['硬核科幻', '哲学思考', '人性探讨'],
    },
    coreConflict: {
      mainContradiction: '人类与AI的共存问题',
      opposingSides: ['人类至上主义者', 'AI权利倡导者'],
    },
    theme: '科技与人性的边界',
    emotionalTone: '深沉思考',
    storyBackground: {
      era: '2150年',
      region: '地球与火星殖民地',
      socialEnvironment: 'AI已获得部分公民权',
    },
    narrativePerspective: '第三人称限知视角',
    expectedLength: {
      totalWords: 60000,
      chapters: 20,
    },
    uniqueSellingPoints: ['独特的AI伦理探讨', '复杂的道德困境', '硬核科技设定'],
    metadata: {
      generatedAt: '2024-01-01T00:00:00Z',
      novelAgentVersion: '1.0.0',
    },
  };

  const mockWorldState: WorldState = {
    characters: {
      char_001: {
        characterId: 'char_001',
        location: 'loc_001',
        health: '健康',
        inventory: [],
        knownInfo: [],
        unknownInfo: [],
        emotion: '平静',
        emotionSource: '初始状态',
      },
    },
    locations: {
      loc_001: {
        locationId: 'loc_001',
        currentWeather: '晴朗',
        presentCharacters: ['char_001'],
        recentEvents: [],
      },
    },
    timeline: [],
    hooks: {},
    worldRules: [],
    lastUpdatedChapter: '',
  };

  it('应该生成三层大纲结构', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    expect(output.novelOutline).toBeDefined();
    expect(output.volumeOutlines).toBeDefined();
    expect(output.chapterOutlines).toBeDefined();
  });

  it('应该返回AI_CHAT Effect声明用于生成全书大纲', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    expect(aiChatEffects.length).toBeGreaterThanOrEqual(3); // 全书、卷、章
    
    // 验证全书大纲生成Effect
    const novelOutlineEffect = aiChatEffects[0];
    expect(novelOutlineEffect.payload.model).toBe('json');
    expect(novelOutlineEffect.payload.messages[1].content).toContain('全书大纲');
  });

  it('应该返回AI_CHAT Effect声明用于生成卷大纲', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证卷大纲生成Effect
    const volumeOutlinesEffect = aiChatEffects[1];
    expect(volumeOutlinesEffect.payload.model).toBe('json');
    expect(volumeOutlinesEffect.payload.messages[1].content).toContain('3卷');
  });

  it('应该返回AI_CHAT Effect声明用于生成章大纲', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证章大纲生成Effect
    const chapterOutlinesEffect = aiChatEffects[2];
    expect(chapterOutlinesEffect.payload.model).toBe('json');
    expect(chapterOutlinesEffect.payload.messages[1].content).toContain('章节级大纲');
  });

  it('应该计算正确的总章数', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 4,
        chaptersPerVolume: 8,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const logEffect = output.effects.find((e) => e.type === 'LOG_INFO');
    expect(logEffect?.payload.context?.totalChapters).toBe(32); // 4 * 8
  });

  it('应该返回ENSURE_DIR Effect声明', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const ensureDirEffects = output.effects.filter((e) => e.type === 'ENSURE_DIR');
    expect(ensureDirEffects.length).toBeGreaterThanOrEqual(2);
    expect(ensureDirEffects[0].payload.path).toBe('test-novel/outline');
    expect(ensureDirEffects[1].payload.path).toBe('test-novel/outline/chapters');
  });

  it('应该返回SAVE_FILE Effect声明用于保存全书大纲', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const saveFileEffect = output.effects.find((e) => e.type === 'SAVE_FILE');
    expect(saveFileEffect).toBeDefined();
    expect(saveFileEffect?.payload.path).toBe('test-novel/outline/novel.yaml');
    expect(saveFileEffect?.payload.content).toContain('全书大纲');
  });

  it('应该返回LOG_INFO Effect声明', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    const logEffect = output.effects.find((e) => e.type === 'LOG_INFO');
    expect(logEffect).toBeDefined();
    expect(logEffect?.payload.message).toContain('Phase3大纲规划完成');
  });

  it('应该初始化空的卷和章大纲数组', () => {
    // Arrange
    const input: Phase3Input = {
      requirements: mockRequirements,
      worldState: mockWorldState,
      projectName: 'test-novel',
      config: {
        volumes: 2,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase3OutlinePlanning(input);

    // Assert
    expect(output.volumeOutlines).toEqual([]);
    expect(output.chapterOutlines).toEqual([]);
  });
});
