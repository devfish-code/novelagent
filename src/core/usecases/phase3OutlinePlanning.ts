/**
 * Phase3: 大纲规划
 * 
 * 职责:
 * - 生成全书大纲(主题、核心问题、情感弧线)
 * - 生成卷大纲(每卷核心任务、结束状态)
 * - 生成章大纲(场景级、伏笔规划、状态变化)
 * 
 * Requirements: 3.3, 3.11
 */

import type { Effect } from '../effects.js';
import type { Requirements } from '../models/requirements.js';
import type { GenerationConfig } from '../models/config.js';
import type { WorldState } from '../models/worldState.js';
import type { NovelOutline, VolumeOutline, ChapterOutline } from '../models/outline.js';

/**
 * Phase3输入
 */
export interface Phase3Input {
  requirements: Requirements;
  worldState: WorldState;
  projectName: string;
  config: GenerationConfig;
}

/**
 * Phase3输出
 */
export interface Phase3Output {
  novelOutline: NovelOutline;
  volumeOutlines: VolumeOutline[];
  chapterOutlines: ChapterOutline[];
  effects: Effect[];
}

/**
 * Phase3: 大纲规划
 * 
 * 生成三层大纲(全书→卷→章)
 * 
 * Requirements: 3.3, 3.11
 * 
 * @param input Phase3输入
 * @returns Phase3输出(大纲和Effects)
 */
export function phase3OutlinePlanning(input: Phase3Input): Phase3Output {
  const { requirements, worldState, projectName, config } = input;
  const effects: Effect[] = [];

  // 确保outline目录存在
  effects.push({
    type: 'ENSURE_DIR',
    payload: {
      path: `${projectName}/outline`,
    },
  });

  effects.push({
    type: 'ENSURE_DIR',
    payload: {
      path: `${projectName}/outline/chapters`,
    },
  });

  // Requirement 3.3: 生成全书大纲
  const novelOutlinePrompt = buildNovelOutlinePrompt(requirements);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说大纲策划师,负责创建完整的小说大纲。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: novelOutlinePrompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // Requirement 3.3: 生成卷大纲
  const volumeOutlinesPrompt = buildVolumeOutlinesPrompt(requirements, config);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说大纲策划师,负责创建卷级大纲。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: volumeOutlinesPrompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // Requirement 3.11: 生成章大纲
  const chapterOutlinesPrompt = buildChapterOutlinesPrompt(requirements, worldState, config);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说大纲策划师,负责创建章节级大纲。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: chapterOutlinesPrompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // 初始化大纲对象(实际数据由Bus层从AI响应中解析)
  const novelOutline: NovelOutline = {
    title: requirements.expectedLength.totalWords > 0 ? '小说标题' : '',
    theme: requirements.theme,
    coreQuestion: '',
    emotionalArc: requirements.emotionalTone,
  };

  const volumeOutlines: VolumeOutline[] = [];
  const chapterOutlines: ChapterOutline[] = [];

  // 保存全书大纲
  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: `${projectName}/outline/novel.yaml`,
      content: formatNovelOutlineAsYaml(novelOutline),
    },
  });

  // 保存卷大纲(每卷一个文件)
  // 注意: 实际保存由Bus层在获取AI响应后执行
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '准备保存卷大纲',
      context: {
        volumes: config.volumes,
      },
    },
  });

  // 保存章大纲(每章一个文件)
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '准备保存章大纲',
      context: {
        totalChapters: config.volumes * config.chaptersPerVolume,
      },
    },
  });

  // 记录日志
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: 'Phase3大纲规划完成',
      context: {
        projectName,
        volumes: config.volumes,
        totalChapters: config.volumes * config.chaptersPerVolume,
      },
    },
  });

  return { novelOutline, volumeOutlines, chapterOutlines, effects };
}

/**
 * 构建全书大纲生成提示词
 */
function buildNovelOutlinePrompt(requirements: Requirements): string {
  return `
请为以下小说创建全书大纲:

小说类型: ${requirements.novelType}
主题: ${requirements.theme}
核心冲突: ${requirements.coreConflict.mainContradiction}
情感基调: ${requirements.emotionalTone}
预期篇幅: ${requirements.expectedLength.totalWords}字, ${requirements.expectedLength.chapters}章

要求:
1. 提炼小说的核心问题(驱动整个故事的根本问题)
2. 描述情感弧线(读者情绪的整体走向)
3. 确保主题贯穿始终

输出JSON格式:

{
  "title": "小说标题",
  "theme": "${requirements.theme}",
  "coreQuestion": "核心问题描述",
  "emotionalArc": "情感弧线描述"
}

注意:
- 核心问题要能引发读者思考
- 情感弧线要有起伏,避免平淡
`;
}

/**
 * 构建卷大纲生成提示词
 */
function buildVolumeOutlinesPrompt(requirements: Requirements, config: GenerationConfig): string {
  return `
请为以下小说创建${config.volumes}卷的卷级大纲:

小说类型: ${requirements.novelType}
主题: ${requirements.theme}
核心冲突: ${requirements.coreConflict.mainContradiction}
每卷章数: ${config.chaptersPerVolume}

要求:
1. 每卷要有明确的核心任务
2. 每卷要有清晰的结束状态
3. 卷与卷之间要有递进关系
4. 确保整体节奏合理

输出JSON格式,包含卷数组:

{
  "volumes": [
    {
      "volume": 1,
      "title": "第一卷标题",
      "coreTask": "核心任务描述",
      "endingState": "结束状态描述",
      "chapters": []
    }
  ]
}

注意:
- 卷标题要吸引人
- 核心任务要具体、可衡量
- 结束状态要为下一卷埋下伏笔
`;
}

/**
 * 构建章大纲生成提示词
 */
function buildChapterOutlinesPrompt(
  requirements: Requirements,
  worldState: WorldState,
  config: GenerationConfig
): string {
  const totalChapters = config.volumes * config.chaptersPerVolume;
  const characterIds = Object.keys(worldState.characters);
  const locationIds = Object.keys(worldState.locations);

  return `
请为以下小说创建${totalChapters}章的章节级大纲:

小说类型: ${requirements.novelType}
主题: ${requirements.theme}
核心冲突: ${requirements.coreConflict.mainContradiction}
总章数: ${totalChapters}
每章字数: ${config.wordsPerChapter}

可用角色ID: ${characterIds.length > 0 ? characterIds.join(', ') : 'char_001, char_002, ...'}
可用地点ID: ${locationIds.length > 0 ? locationIds.join(', ') : 'loc_001, loc_002, ...'}

要求:
1. 每章要有明确的功能(推进情节/角色发展/世界展示)
2. 每章要包含2-4个场景
3. 每个场景要指定地点和涉及角色
4. 规划伏笔的埋设和回收
5. 描述情绪变化(开始→结束)

输出JSON格式,包含章节数组:

{
  "chapters": [
    {
      "volume": 1,
      "chapter": 1,
      "title": "第一章标题",
      "function": "推进情节",
      "scenes": [
        {
          "location": "loc_001",
          "characters": ["char_001", "char_002"],
          "events": "场景事件描述",
          "reveals": ["揭示的信息1"]
        }
      ],
      "emotionalTone": {
        "start": "平静",
        "end": "紧张"
      },
      "hooksToPlant": ["hook_001"],
      "hooksToResolve": [],
      "stateChanges": [
        {
          "entityType": "character",
          "entityId": "char_001",
          "property": "location",
          "newValue": "loc_002",
          "reason": "前往新地点"
        }
      ]
    }
  ]
}

注意:
- 章节标题要吸引人
- 场景要有冲突和张力
- 伏笔要合理分布,避免集中在后期
- 状态变化要符合逻辑
`;
}

/**
 * 将全书大纲格式化为YAML
 */
function formatNovelOutlineAsYaml(outline: NovelOutline): string {
  const lines: string[] = [];

  lines.push('# 全书大纲');
  lines.push('');
  lines.push(`title: "${outline.title}"`);
  lines.push(`theme: "${outline.theme}"`);
  lines.push(`coreQuestion: "${outline.coreQuestion}"`);
  lines.push(`emotionalArc: "${outline.emotionalArc}"`);
  lines.push('');

  return lines.join('\n');
}
