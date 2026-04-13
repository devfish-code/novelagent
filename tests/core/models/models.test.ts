/**
 * Core Models测试
 * 测试所有Zod schema的验证逻辑
 */

import { describe, it, expect } from 'vitest';
import {
  CharacterSchema,
  CharacterStateSchema,
  LocationSchema,
  LocationStateSchema,
  ChapterOutlineSchema,
  VolumeOutlineSchema,
  NovelOutlineSchema,
  ChapterSchema,
  ChapterMetadataSchema,
  WorldStateSchema,
  WorldRuleSchema,
  HookSchema,
  TimelineEventSchema,
  ProjectSchema,
  RequirementsSchema,
  GenerationConfigSchema,
  AIModelConfigSchema,
  AIConfigSchema,
} from '../../../src/core/models/index.js';

describe('Core Models Schema Validation', () => {
  describe('CharacterSchema', () => {
    it('应该验证有效的角色数据', () => {
      const validCharacter = {
        id: 'char_001',
        name: '张三',
        aliases: ['小张'],
        gender: '男' as const,
        age: 25,
        appearance: {
          height: '180cm',
          build: '健壮',
          distinctiveFeatures: ['浓眉'],
          typicalClothing: '休闲装',
        },
        personality: {
          coreTraits: ['勇敢', '正直'],
          weaknesses: ['冲动'],
          catchphrases: ['没问题'],
          speechStyle: '直接',
        },
        background: {
          origin: '北京',
          keyExperiences: ['参军'],
        },
        motivation: '保护家人',
        abilities: {
          current: ['格斗'],
          potential: ['领导'],
          limits: '体力有限',
        },
        state: {
          location: 'loc_001',
          health: '健康',
          inventory: ['手机'],
          knownInfo: ['秘密'],
          unknownInfo: ['真相'],
          emotion: '平静',
          emotionSource: '日常',
        },
      };

      const result = CharacterSchema.safeParse(validCharacter);
      expect(result.success).toBe(true);
    });

    it('应该拒绝缺少必需字段的数据', () => {
      const invalidCharacter = {
        id: 'char_001',
        name: '张三',
        // 缺少其他必需字段
      };

      const result = CharacterSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });
  });

  describe('LocationSchema', () => {
    it('应该验证有效的地点数据', () => {
      const validLocation = {
        id: 'loc_001',
        name: '北京',
        type: '城市' as const,
        region: '华北',
        description: '首都',
        keyLandmarks: ['天安门'],
        travelTime: { loc_002: '2小时' },
        socialEnvironment: '繁华',
        currentWeather: '晴',
      };

      const result = LocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });
  });

  describe('ChapterOutlineSchema', () => {
    it('应该验证有效的章节大纲', () => {
      const validOutline = {
        volume: 1,
        chapter: 1,
        title: '开始',
        function: '引入主角',
        scenes: [
          {
            location: 'loc_001',
            characters: ['char_001'],
            events: '主角登场',
            reveals: ['身份'],
          },
        ],
        emotionalTone: {
          start: '平静',
          end: '紧张',
        },
        hooksToPlant: ['hook_001'],
        hooksToResolve: [],
        stateChanges: [],
      };

      const result = ChapterOutlineSchema.safeParse(validOutline);
      expect(result.success).toBe(true);
    });
  });

  describe('WorldStateSchema', () => {
    it('应该验证有效的世界状态', () => {
      const validWorldState = {
        characters: {
          char_001: {
            characterId: 'char_001',
            location: 'loc_001',
            health: '健康',
            inventory: [],
            knownInfo: [],
            unknownInfo: [],
            emotion: '平静',
            emotionSource: '日常',
          },
        },
        locations: {
          loc_001: {
            locationId: 'loc_001',
            currentWeather: '晴',
            presentCharacters: ['char_001'],
            recentEvents: [],
          },
        },
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: 'vol-1-ch-001',
      };

      const result = WorldStateSchema.safeParse(validWorldState);
      expect(result.success).toBe(true);
    });
  });

  describe('ProjectSchema', () => {
    it('应该验证有效的项目元数据', () => {
      const validProject = {
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
          currentPhase: 'phase1' as const,
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
        status: 'draft' as const,
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('应该验证章节元数据', () => {
      const validMetadata = {
        volume: 1,
        chapter: 1,
        title: '第一章',
        wordCount: 3000,
        status: 'completed' as const,
        generatedAt: '2024-01-01T00:00:00Z',
        fixRounds: 1,
      };

      const result = ChapterMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe('RequirementsSchema', () => {
    it('应该验证有效的需求文档', () => {
      const validRequirements = {
        novelType: '科幻',
        targetAudience: {
          ageRange: '18-35',
          readingPreferences: ['科幻', '冒险'],
        },
        coreConflict: {
          mainContradiction: '人类vs外星人',
          opposingSides: ['地球联盟', '外星舰队'],
        },
        theme: '生存与希望',
        emotionalTone: '紧张刺激',
        storyBackground: {
          era: '未来',
          region: '太空',
          socialEnvironment: '战争时期',
        },
        narrativePerspective: '第三人称全知',
        expectedLength: {
          totalWords: 300000,
          chapters: 100,
        },
        uniqueSellingPoints: ['硬科幻', '太空战争'],
        metadata: {
          generatedAt: '2024-01-01T00:00:00Z',
          novelAgentVersion: '1.0.0',
        },
      };

      const result = RequirementsSchema.safeParse(validRequirements);
      expect(result.success).toBe(true);
    });
  });

  describe('GenerationConfigSchema', () => {
    it('应该验证有效的生成配置', () => {
      const validConfig = {
        volumes: 3,
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      };

      const result = GenerationConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的数值', () => {
      const invalidConfig = {
        volumes: 0, // 应该 >= 1
        chaptersPerVolume: 10,
        wordsPerChapter: 3000,
        maxFixRounds: 3,
      };

      const result = GenerationConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('AIConfigSchema', () => {
    it('应该验证有效的AI配置', () => {
      const validConfig = {
        mainModel: {
          provider: 'openai-compatible' as const,
          baseURL: 'https://api.example.com',
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        },
        jsonModel: {
          provider: 'openai-compatible' as const,
          baseURL: 'https://api.example.com',
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 1000,
        },
      };

      const result = AIConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的temperature值', () => {
      const invalidConfig = {
        mainModel: {
          provider: 'openai-compatible' as const,
          baseURL: 'https://api.example.com',
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 2.5, // 应该 <= 2
          maxTokens: 2000,
        },
        jsonModel: {
          provider: 'openai-compatible' as const,
          baseURL: 'https://api.example.com',
          apiKey: 'test-key',
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 1000,
        },
      };

      const result = AIConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('HookSchema', () => {
    it('应该验证有效的伏笔数据', () => {
      const validHook = {
        id: 'hook_001',
        description: '神秘的盒子',
        plantedAt: 'vol-1-ch-001',
        status: 'planted' as const,
      };

      const result = HookSchema.safeParse(validHook);
      expect(result.success).toBe(true);
    });

    it('应该验证已解决的伏笔', () => {
      const resolvedHook = {
        id: 'hook_001',
        description: '神秘的盒子',
        plantedAt: 'vol-1-ch-001',
        status: 'resolved' as const,
        resolvedAt: 'vol-1-ch-010',
      };

      const result = HookSchema.safeParse(resolvedHook);
      expect(result.success).toBe(true);
    });
  });

  describe('TimelineEventSchema', () => {
    it('应该验证有效的时间线事件', () => {
      const validEvent = {
        timestamp: '第1天上午',
        event: '主角醒来',
        involvedCharacters: ['char_001'],
        location: 'loc_001',
      };

      const result = TimelineEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('WorldRuleSchema', () => {
    it('应该验证有效的世界规则', () => {
      const validRule = {
        id: 'rule_001',
        category: '魔法',
        description: '魔法需要消耗魔力',
        constraints: ['魔力有限', '需要咒语'],
      };

      const result = WorldRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });
  });
});
