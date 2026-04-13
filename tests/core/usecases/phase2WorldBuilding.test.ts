/**
 * Phase2世界构建单元测试
 * 
 * Requirements: 3.2, 3.10
 */

import { describe, it, expect } from 'vitest';
import { phase2WorldBuilding } from '../../../src/core/usecases/phase2WorldBuilding';
import type { Phase2Input } from '../../../src/core/usecases/phase2WorldBuilding';
import type { Requirements } from '../../../src/core/models/requirements';

describe('phase2WorldBuilding', () => {
  const mockRequirements: Requirements = {
    novelType: '玄幻',
    targetAudience: {
      ageRange: '18-35岁',
      readingPreferences: ['热血', '成长', '权谋'],
    },
    coreConflict: {
      mainContradiction: '正邪对立',
      opposingSides: ['正道联盟', '魔教'],
    },
    theme: '成长与自我认同',
    emotionalTone: '热血激昂',
    storyBackground: {
      era: '架空古代',
      region: '东方大陆',
      socialEnvironment: '修仙世界,宗门林立',
    },
    narrativePerspective: '第三人称全知视角',
    expectedLength: {
      totalWords: 90000,
      chapters: 30,
    },
    uniqueSellingPoints: ['独特的修炼体系', '复杂的人物关系', '宏大的世界观'],
    metadata: {
      generatedAt: '2024-01-01T00:00:00Z',
      novelAgentVersion: '1.0.0',
    },
  };

  it('应该初始化世界状态', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    expect(output.worldState).toBeDefined();
    expect(output.worldState.characters).toEqual({});
    expect(output.worldState.locations).toEqual({});
    expect(output.worldState.timeline).toEqual([]);
    expect(output.worldState.hooks).toEqual({});
    expect(output.worldState.worldRules).toEqual([]);
    expect(output.worldState.lastUpdatedChapter).toBe('');
  });

  it('应该返回AI_CHAT Effect声明用于生成角色', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    expect(aiChatEffects.length).toBeGreaterThanOrEqual(3); // 角色、地点、规则
    
    // 验证角色生成Effect
    const charactersEffect = aiChatEffects[0];
    expect(charactersEffect.payload.model).toBe('json');
    expect(charactersEffect.payload.messages[1].content).toContain('5个核心角色');
  });

  it('应该返回AI_CHAT Effect声明用于生成地点', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证地点生成Effect
    const locationsEffect = aiChatEffects[1];
    expect(locationsEffect.payload.model).toBe('json');
    expect(locationsEffect.payload.messages[1].content).toContain('地点档案');
  });

  it('应该返回AI_CHAT Effect声明用于生成世界规则', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const aiChatEffects = output.effects.filter((e) => e.type === 'AI_CHAT');
    
    // 验证世界规则生成Effect
    const worldRulesEffect = aiChatEffects[2];
    expect(worldRulesEffect.payload.model).toBe('json');
    expect(worldRulesEffect.payload.messages[1].content).toContain('世界规则体系');
  });

  it('应该返回ENSURE_DIR Effect声明', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const ensureDirEffect = output.effects.find((e) => e.type === 'ENSURE_DIR');
    expect(ensureDirEffect).toBeDefined();
    expect(ensureDirEffect?.payload.path).toBe('test-novel/world');
  });

  it('应该返回SAVE_FILE Effect声明用于保存世界状态', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const saveFileEffect = output.effects.find((e) => e.type === 'SAVE_FILE');
    expect(saveFileEffect).toBeDefined();
    expect(saveFileEffect?.payload.path).toBe('test-novel/world/world-state.yaml');
    expect(saveFileEffect?.payload.content).toContain('世界状态数据库');
  });

  it('应该返回LOG_INFO Effect声明', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    const logEffect = output.effects.find((e) => e.type === 'LOG_INFO');
    expect(logEffect).toBeDefined();
    expect(logEffect?.payload.message).toContain('Phase2世界构建完成');
  });

  it('应该初始化空的角色、地点和规则数组', () => {
    // Arrange
    const input: Phase2Input = {
      requirements: mockRequirements,
      projectName: 'test-novel',
      config: {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      },
    };

    // Act
    const output = phase2WorldBuilding(input);

    // Assert
    expect(output.characters).toEqual([]);
    expect(output.locations).toEqual([]);
    expect(output.worldRules).toEqual([]);
  });
});
