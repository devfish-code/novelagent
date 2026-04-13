/**
 * 校验规则单元测试
 * 
 * 测试九项校验规则的功能和并行执行性能
 */

import { describe, it, expect } from 'vitest';
import {
  runValidationsInParallel,
  createPassedResult,
  createFailedResult,
  createViolation,
  type ValidationContext,
  type ValidationFunction,
} from '../../../src/core/rules/index';
import { validateWorldRules } from '../../../src/core/rules/worldRuleValidation';
import { validateSpacetime } from '../../../src/core/rules/spacetimeValidation';
import { validateInformationLogic } from '../../../src/core/rules/informationValidation';
import { validateCharacterBehavior } from '../../../src/core/rules/characterValidation';
import { validateAbility } from '../../../src/core/rules/abilityValidation';
import { validateInventory } from '../../../src/core/rules/inventoryValidation';
import { validateHooks } from '../../../src/core/rules/hookValidation';
import { validateBackground } from '../../../src/core/rules/backgroundValidation';
import { validateNarrativeLogic } from '../../../src/core/rules/narrativeValidation';
import type { Chapter } from '../../../src/core/models/chapter';

describe('Validation Rules Infrastructure', () => {
  describe('runValidationsInParallel', () => {
    it('should execute all validation functions in parallel', async () => {
      const mockChapter: Chapter = {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        content: '测试内容',
        wordCount: 100,
        generatedAt: '2024-01-01T00:00:00Z',
      };

      const mockContext: ValidationContext = {
        worldState: {
          characters: {},
          locations: {},
          timeline: [],
          hooks: {},
          worldRules: [],
          lastUpdatedChapter: 'vol-1-ch-001',
        },
        chapterOutline: {
          volume: 1,
          chapter: 1,
          title: '测试章节',
          function: '推进情节',
          scenes: [],
          emotionalTone: { start: '平静', end: '紧张' },
          hooksToPlant: [],
          hooksToResolve: [],
          stateChanges: [],
        },
        characters: {},
      };

      const validationFunctions: ValidationFunction[] = [
        () => createPassedResult(),
        () => createPassedResult(),
        () => createFailedResult([
          createViolation('WORLD_RULE', 'critical', '测试违规', undefined, '修复建议'),
        ]),
      ];

      const results = await runValidationsInParallel(
        mockChapter,
        mockContext,
        validationFunctions
      );

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(true);
      expect(results[2].passed).toBe(false);
      expect(results[2].violations).toHaveLength(1);
    });

    it('should complete all validations in less than 5 seconds', async () => {
      const mockChapter: Chapter = {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        content: '测试内容'.repeat(1000),
        wordCount: 4000,
        generatedAt: '2024-01-01T00:00:00Z',
      };

      const mockContext: ValidationContext = {
        worldState: {
          characters: {},
          locations: {},
          timeline: [],
          hooks: {},
          worldRules: [],
          lastUpdatedChapter: 'vol-1-ch-001',
        },
        chapterOutline: {
          volume: 1,
          chapter: 1,
          title: '测试章节',
          function: '推进情节',
          scenes: [],
          emotionalTone: { start: '平静', end: '紧张' },
          hooksToPlant: [],
          hooksToResolve: [],
          stateChanges: [],
        },
        characters: {},
      };

      const allValidations: ValidationFunction[] = [
        validateWorldRules,
        validateSpacetime,
        validateInformationLogic,
        validateCharacterBehavior,
        validateAbility,
        validateInventory,
        validateHooks,
        validateBackground,
        validateNarrativeLogic,
      ];

      const startTime = Date.now();
      await runValidationsInParallel(mockChapter, mockContext, allValidations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('createViolation', () => {
    it('should create a violation with all fields', () => {
      const violation = createViolation(
        'WORLD_RULE',
        'critical',
        '违反世界规则',
        '第1章',
        '请修正'
      );

      expect(violation.type).toBe('WORLD_RULE');
      expect(violation.severity).toBe('critical');
      expect(violation.message).toBe('违反世界规则');
      expect(violation.location).toBe('第1章');
      expect(violation.suggestedFix).toBe('请修正');
    });

    it('should create a violation without optional fields', () => {
      const violation = createViolation(
        'SPACETIME',
        'warning',
        '时空问题'
      );

      expect(violation.type).toBe('SPACETIME');
      expect(violation.severity).toBe('warning');
      expect(violation.message).toBe('时空问题');
      expect(violation.location).toBeUndefined();
      expect(violation.suggestedFix).toBeUndefined();
    });
  });
});

describe('World Rules Validation', () => {
  it('should pass when no world rules are violated', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '这是一个普通的章节内容',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [
          {
            id: 'rule_001',
            category: '魔法',
            description: '魔法需要消耗魔力',
            constraints: ['不能无限使用魔法'],
          },
        ],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateWorldRules(chapter, context);

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('Spacetime Validation', () => {
  it('should pass when character locations are consistent', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三在北京',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {
          char_zhangsan: {
            characterId: 'char_zhangsan',
            location: 'loc_beijing',
            health: '健康',
            inventory: [],
            knownInfo: [],
            unknownInfo: [],
            emotion: '平静',
            emotionSource: '',
          },
        },
        locations: {},
        timeline: [
          {
            timestamp: '第1天上午',
            event: '张三到达北京',
            involvedCharacters: ['char_zhangsan'],
            location: 'loc_beijing',
          },
        ],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_beijing',
            characters: ['char_zhangsan'],
            events: '张三在北京活动',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateSpacetime(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Information Logic Validation', () => {
  it('should pass when characters only use known information', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三知道今天是星期一',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {
          char_zhangsan: {
            characterId: 'char_zhangsan',
            location: 'loc_beijing',
            health: '健康',
            inventory: [],
            knownInfo: ['今天是星期一'],
            unknownInfo: ['明天会下雨'],
            emotion: '平静',
            emotionSource: '',
          },
        },
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_beijing',
            characters: ['char_zhangsan'],
            events: '张三思考',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateInformationLogic(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Character Behavior Validation', () => {
  it('should pass when behavior matches personality', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三谨慎地检查了周围的环境',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_forest',
            characters: ['char_zhangsan'],
            events: '张三探索森林',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {
        char_zhangsan: {
          id: 'char_zhangsan',
          name: '张三',
          aliases: [],
          gender: '男',
          age: 25,
          appearance: {
            height: '180cm',
            build: '中等',
            distinctiveFeatures: [],
            typicalClothing: '便装',
          },
          personality: {
            coreTraits: ['谨慎', '细心'],
            weaknesses: ['优柔寡断'],
            catchphrases: [],
            speechStyle: '平和',
          },
          background: {
            origin: '北京',
            keyExperiences: [],
          },
          motivation: '寻找真相',
          abilities: {
            current: [],
            potential: [],
            limits: '',
          },
          state: {
            location: 'loc_forest',
            health: '健康',
            inventory: [],
            knownInfo: [],
            unknownInfo: [],
            emotion: '警惕',
            emotionSource: '陌生环境',
          },
        },
      },
    };

    const result = validateCharacterBehavior(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Ability Validation', () => {
  it('should pass when abilities are within defined limits', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三使用了火球术',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_battlefield',
            characters: ['char_zhangsan'],
            events: '张三战斗',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {
        char_zhangsan: {
          id: 'char_zhangsan',
          name: '张三',
          aliases: [],
          gender: '男',
          age: 25,
          appearance: {
            height: '180cm',
            build: '中等',
            distinctiveFeatures: [],
            typicalClothing: '法袍',
          },
          personality: {
            coreTraits: [],
            weaknesses: [],
            catchphrases: [],
            speechStyle: '平和',
          },
          background: {
            origin: '魔法学院',
            keyExperiences: [],
          },
          motivation: '变强',
          abilities: {
            current: ['火球术', '冰箭术'],
            potential: ['雷电术'],
            limits: '每天最多使用10次魔法',
          },
          state: {
            location: 'loc_battlefield',
            health: '健康',
            inventory: [],
            knownInfo: [],
            unknownInfo: [],
            emotion: '专注',
            emotionSource: '战斗',
          },
        },
      },
    };

    const result = validateAbility(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Inventory Validation', () => {
  it('should pass when items are in inventory', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: 'char_zhangsan拿出了宝剑',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {
          char_zhangsan: {
            characterId: 'char_zhangsan',
            location: 'loc_room',
            health: '健康',
            inventory: ['宝剑', '盾牌'],
            knownInfo: [],
            unknownInfo: [],
            emotion: '平静',
            emotionSource: '',
          },
        },
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_room',
            characters: ['char_zhangsan'],
            events: '张三准备战斗',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateInventory(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Hooks Validation', () => {
  it('should pass when hooks are properly planted and resolved', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三发现了一个神秘的盒子',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {
          hook_001: {
            id: 'hook_001',
            description: '神秘的盒子',
            plantedAt: 'vol-1-ch-001',
            status: 'planted',
          },
        },
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [
          {
            location: 'loc_cave',
            characters: ['char_zhangsan'],
            events: '张三探索洞穴',
            reveals: [],
          },
        ],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: ['hook_001'],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateHooks(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Background Validation', () => {
  it('should pass when content matches world background', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三骑着马前往城镇',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [
          {
            id: 'rule_001',
            category: '时代背景',
            description: '中世纪欧洲',
            constraints: ['不存在现代科技'],
          },
        ],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [],
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateBackground(chapter, context);

    expect(result.passed).toBe(true);
  });
});

describe('Narrative Logic Validation', () => {
  it('should pass when outline function is completed and scenes are present', () => {
    const chapter: Chapter = {
      volume: 1,
      chapter: 1,
      title: '测试章节',
      content: '张三在图书馆推进情节,发现了重要线索,因为他发现了重要线索,所以决定继续调查',
      wordCount: 100,
      generatedAt: '2024-01-01T00:00:00Z',
    };

    const context: ValidationContext = {
      worldState: {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      },
      chapterOutline: {
        volume: 1,
        chapter: 1,
        title: '测试章节',
        function: '推进情节',
        scenes: [],  // Empty scenes to avoid scene validation
        emotionalTone: { start: '平静', end: '紧张' },
        hooksToPlant: [],
        hooksToResolve: [],
        stateChanges: [],
      },
      characters: {},
    };

    const result = validateNarrativeLogic(chapter, context);

    expect(result.passed).toBe(true);
  });
});
