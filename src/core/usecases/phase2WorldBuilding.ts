/**
 * Phase2: 世界构建
 * 
 * 职责:
 * - 生成世界观设定
 * - 生成角色档案(至少5个核心角色)
 * - 生成地点档案
 * - 生成世界规则体系
 * - 初始化时间线
 * 
 * Requirements: 3.2, 3.10
 */

import type { Effect } from '../effects.js';
import type { Requirements } from '../models/requirements.js';
import type { GenerationConfig } from '../models/config.js';
import type { Character } from '../models/character.js';
import type { Location } from '../models/location.js';
import type { WorldState, WorldRule } from '../models/worldState.js';

/**
 * Phase2输入
 */
export interface Phase2Input {
  requirements: Requirements;
  projectName: string;
  config: GenerationConfig;
}

/**
 * Phase2输出
 */
export interface Phase2Output {
  worldState: WorldState;
  characters: Character[];
  locations: Location[];
  worldRules: WorldRule[];
  effects: Effect[];
}

/**
 * Phase2: 世界构建
 * 
 * 生成世界观、角色档案、地点档案、规则体系
 * 
 * Requirements: 3.2, 3.10
 * 
 * @param input Phase2输入
 * @returns Phase2输出(世界状态和Effects)
 */
export function phase2WorldBuilding(input: Phase2Input): Phase2Output {
  const { requirements, projectName } = input;
  const effects: Effect[] = [];

  // 确保world目录存在
  effects.push({
    type: 'ENSURE_DIR',
    payload: {
      path: `${projectName}/world`,
    },
  });

  // Requirement 3.2, 3.10: 生成至少5个核心角色
  const charactersPrompt = buildCharactersPrompt(requirements, 5);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说角色设计师,负责创建丰富立体的角色档案。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: charactersPrompt,
        },
      ],
      temperature: 0.8,
    },
  });

  // 生成地点档案
  const locationsPrompt = buildLocationsPrompt(requirements);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的世界观设计师,负责创建详细的地点档案。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: locationsPrompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // 生成世界规则体系
  const worldRulesPrompt = buildWorldRulesPrompt(requirements);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的世界观设计师,负责创建完整的世界规则体系。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: worldRulesPrompt,
        },
      ],
      temperature: 0.6,
    },
  });

  // 初始化世界状态(实际数据由Bus层从AI响应中解析)
  const worldState: WorldState = {
    characters: {},
    locations: {},
    timeline: [],
    hooks: {},
    worldRules: [],
    lastUpdatedChapter: '',
  };

  const characters: Character[] = [];
  const locations: Location[] = [];
  const worldRules: WorldRule[] = [];

  // 保存世界状态文件
  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: `${projectName}/world/world-state.yaml`,
      content: formatWorldStateAsYaml(worldState),
    },
  });

  // 保存角色档案(每个角色一个文件)
  // 注意: 实际保存由Bus层在获取AI响应后执行
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '准备保存角色档案',
      context: {
        expectedCharacters: 5,
      },
    },
  });

  // 保存地点档案
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '准备保存地点档案',
    },
  });

  // 记录日志
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: 'Phase2世界构建完成',
      context: {
        projectName,
        charactersCount: 5,
      },
    },
  });

  return { worldState, characters, locations, worldRules, effects };
}

/**
 * 构建角色生成提示词
 * 
 * Requirement 3.10: 至少生成5个核心角色
 */
function buildCharactersPrompt(requirements: Requirements, minCharacters: number): string {
  return `
请为以下小说创建${minCharacters}个核心角色的详细档案:

小说类型: ${requirements.novelType}
主题: ${requirements.theme}
核心冲突: ${requirements.coreConflict.mainContradiction}
对立双方: ${requirements.coreConflict.opposingSides.join(', ')}
故事背景: ${requirements.storyBackground.era}, ${requirements.storyBackground.region}

要求:
1. 至少创建${minCharacters}个核心角色
2. 角色应该涵盖冲突的不同立场
3. 每个角色都要有鲜明的性格特点和动机
4. 角色之间要有关系网络(盟友、敌人、亲人等)
5. 角色能力要符合世界观设定

输出JSON格式,包含角色数组:

{
  "characters": [
    {
      "id": "char_001",
      "name": "角色名",
      "aliases": ["别名1", "称号1"],
      "gender": "男",
      "age": 25,
      "appearance": {
        "height": "身高描述",
        "build": "体型描述",
        "distinctiveFeatures": ["显著特征1", "显著特征2"],
        "typicalClothing": "典型着装描述"
      },
      "personality": {
        "coreTraits": ["核心特质1", "核心特质2", "核心特质3"],
        "weaknesses": ["性格弱点1", "性格弱点2"],
        "catchphrases": ["口头禅1"],
        "speechStyle": "说话风格描述"
      },
      "background": {
        "origin": "出身背景",
        "keyExperiences": ["关键经历1", "关键经历2"]
      },
      "motivation": "当前动机描述",
      "abilities": {
        "current": ["当前能力1", "当前能力2"],
        "potential": ["潜在能力1"],
        "limits": "能力限制描述"
      },
      "state": {
        "location": "loc_001",
        "health": "健康",
        "inventory": ["物品1", "物品2"],
        "knownInfo": ["已知信息1"],
        "unknownInfo": ["未知信息1"],
        "emotion": "平静",
        "emotionSource": "故事开始前的状态"
      }
    }
  ]
}

注意:
- 角色ID格式: char_001, char_002, ...
- 地点ID格式: loc_001, loc_002, ...
- 确保角色设定符合小说类型和背景
- 角色能力要有明确的限制,避免后续能力膨胀
`;
}

/**
 * 构建地点生成提示词
 */
function buildLocationsPrompt(requirements: Requirements): string {
  return `
请为以下小说创建主要地点档案:

小说类型: ${requirements.novelType}
故事背景: ${requirements.storyBackground.era}, ${requirements.storyBackground.region}
社会环境: ${requirements.storyBackground.socialEnvironment}

要求:
1. 创建5-10个主要地点
2. 地点应该涵盖故事的主要场景
3. 包含地点之间的旅行时间
4. 描述地点的社会环境和特点

输出JSON格式,包含地点数组:

{
  "locations": [
    {
      "id": "loc_001",
      "name": "地点名称",
      "type": "城市",
      "region": "所属区域",
      "description": "详细描述",
      "keyLandmarks": ["地标1", "地标2"],
      "travelTime": {
        "loc_002": "2小时",
        "loc_003": "1天"
      },
      "socialEnvironment": "社会环境描述",
      "currentWeather": "晴朗"
    }
  ]
}

注意:
- 地点ID格式: loc_001, loc_002, ...
- 地点类型: 城市、村镇、建筑、自然地标、其他
- 旅行时间要合理,用于后续时空校验
`;
}

/**
 * 构建世界规则生成提示词
 */
function buildWorldRulesPrompt(requirements: Requirements): string {
  return `
请为以下小说创建世界规则体系:

小说类型: ${requirements.novelType}
故事背景: ${requirements.storyBackground.era}, ${requirements.storyBackground.region}
社会环境: ${requirements.storyBackground.socialEnvironment}

要求:
1. 创建5-15条世界规则
2. 规则应该涵盖: 物理法则、魔法/科技系统、社会规则、文化习俗等
3. 每条规则要有明确的约束条件
4. 规则要自洽,不能相互矛盾

输出JSON格式,包含规则数组:

{
  "worldRules": [
    {
      "id": "rule_001",
      "category": "魔法系统",
      "description": "规则描述",
      "constraints": ["约束条件1", "约束条件2"]
    }
  ]
}

注意:
- 规则ID格式: rule_001, rule_002, ...
- 规则类别: 物理法则、魔法系统、科技系统、社会规则、文化习俗、经济规则等
- 约束条件要具体、可校验
`;
}

/**
 * 将世界状态格式化为YAML
 */
function formatWorldStateAsYaml(worldState: WorldState): string {
  const lines: string[] = [];

  lines.push('# 世界状态数据库');
  lines.push('');
  lines.push('characters: {}');
  lines.push('');
  lines.push('locations: {}');
  lines.push('');
  lines.push('timeline: []');
  lines.push('');
  lines.push('hooks: {}');
  lines.push('');
  lines.push('worldRules: []');
  lines.push('');
  lines.push(`lastUpdatedChapter: "${worldState.lastUpdatedChapter}"`);
  lines.push('');

  return lines.join('\n');
}
