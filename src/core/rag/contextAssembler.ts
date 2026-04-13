/**
 * RAG上下文组装器
 * 
 * 职责:
 * - 按优先级组装章节生成所需的上下文
 * - 估算token数量并在超过阈值时裁剪低优先级内容
 * - 确保组装时间 < 1秒
 * 
 * 优先级排序(从高到低):
 * 1. 章级大纲 (不可裁剪)
 * 2. 角色档案 (不可裁剪)
 * 3. 前3章内容
 * 4. 卷大纲
 * 5. 世界状态
 * 6. 前文摘要(第4-10章)
 * 7. 全书大纲
 * 
 * Requirements: 21.1-21.13, 12.1
 */

import { estimateTokens } from '../../utils/tokenEstimator.js';
import type {
  ContextAssemblerInput,
  AssembledContext,
  ContextComponent,
} from './types.js';
import type {
  ChapterOutline,
  VolumeOutline,
  NovelOutline,
} from '../models/outline.js';
import type { Character } from '../models/character.js';
import type { Location } from '../models/location.js';
import type { Chapter, ChapterSummary } from '../models/chapter.js';
import type { WorldState, Hook } from '../models/worldState.js';
import type { Project } from '../models/project.js';
import type { Effect } from '../effects.js';

/**
 * 上下文窗口配置
 */
const CONTEXT_WINDOW_THRESHOLD = 0.8; // 使用80%的上下文窗口
const DEFAULT_MAX_TOKENS = 32768; // 默认最大token数

/**
 * 组装上下文
 * 
 * @param input 上下文组装器输入
 * @returns 组装后的上下文和需要执行的Effects
 */
export function assembleContext(
  input: ContextAssemblerInput
): { context: AssembledContext; effects: Effect[] } {
  const effects: Effect[] = [];
  const { chapterMeta, project } = input;
  const maxTokens = DEFAULT_MAX_TOKENS;
  const threshold = maxTokens * CONTEXT_WINDOW_THRESHOLD;

  // 记录开始时间(用于性能监控)
  const startTime = Date.now();

  // 1. 加载必需组件(不可裁剪)
  const chapterOutline = loadChapterOutline(chapterMeta, project);
  const volumeOutline = loadVolumeOutline(chapterMeta.volume, project);
  const novelOutline = loadNovelOutline(project);
  const relevantCharacters = loadRelevantCharacters(chapterOutline, project);
  const relevantLocations = loadRelevantLocations(chapterOutline, project);

  // 2. 加载可选组件(可裁剪)
  const recentChapters = loadRecentChapters(chapterMeta.chapter, project);
  const chapterSummaries = loadChapterSummaries(chapterMeta.chapter, project);
  const worldState = loadWorldState(project);
  const relevantHooks = loadRelevantHooks(chapterOutline, worldState);

  // 3. 构建组件列表(按优先级排序)
  const components: ContextComponent[] = [
    {
      priority: 1,
      name: 'chapterOutline',
      content: chapterOutline,
      tokens: estimateTokens(JSON.stringify(chapterOutline)),
      canTrim: false,
    },
    {
      priority: 2,
      name: 'relevantCharacters',
      content: relevantCharacters,
      tokens: estimateTokens(JSON.stringify(relevantCharacters)),
      canTrim: false,
    },
    {
      priority: 3,
      name: 'recentChapters',
      content: recentChapters,
      tokens: estimateTokens(JSON.stringify(recentChapters)),
      canTrim: true,
    },
    {
      priority: 4,
      name: 'volumeOutline',
      content: volumeOutline,
      tokens: estimateTokens(JSON.stringify(volumeOutline)),
      canTrim: true,
    },
    {
      priority: 5,
      name: 'worldState',
      content: worldState,
      tokens: estimateTokens(JSON.stringify(worldState)),
      canTrim: true,
    },
    {
      priority: 6,
      name: 'chapterSummaries',
      content: chapterSummaries,
      tokens: estimateTokens(JSON.stringify(chapterSummaries)),
      canTrim: true,
    },
    {
      priority: 7,
      name: 'novelOutline',
      content: novelOutline,
      tokens: estimateTokens(JSON.stringify(novelOutline)),
      canTrim: true,
    },
    {
      priority: 2,
      name: 'relevantLocations',
      content: relevantLocations,
      tokens: estimateTokens(JSON.stringify(relevantLocations)),
      canTrim: false,
    },
    {
      priority: 5,
      name: 'relevantHooks',
      content: relevantHooks,
      tokens: estimateTokens(JSON.stringify(relevantHooks)),
      canTrim: true,
    },
  ];

  // 4. 计算总token数
  let totalTokens = components.reduce((sum, c) => sum + c.tokens, 0);

  // 5. 如果超过阈值,按优先级裁剪
  if (totalTokens > threshold) {
    // 按优先级从低到高排序(用于裁剪)
    const sortedForTrimming = [...components]
      .filter((c) => c.canTrim)
      .sort((a, b) => b.priority - a.priority);

    for (const component of sortedForTrimming) {
      if (totalTokens <= threshold) break;

      // 尝试裁剪该组件
      const trimmed = trimContent(component.content, threshold - (totalTokens - component.tokens));
      if (trimmed) {
        const trimmedTokens = estimateTokens(JSON.stringify(trimmed));
        totalTokens = totalTokens - component.tokens + trimmedTokens;
        component.content = trimmed;
        component.tokens = trimmedTokens;

        effects.push({
          type: 'LOG_DEBUG',
          payload: {
            message: `裁剪组件: ${component.name}`,
            context: {
              originalTokens: component.tokens,
              trimmedTokens,
            },
          },
        });
      } else {
        // 无法裁剪,移除整个组件
        totalTokens -= component.tokens;
        component.content = getEmptyContent(component.name);
        component.tokens = 0;

        effects.push({
          type: 'LOG_DEBUG',
          payload: {
            message: `移除组件: ${component.name}`,
            context: { reason: '无法裁剪且超过阈值' },
          },
        });
      }
    }
  }

  // 6. 构建最终上下文
  const context: AssembledContext = {
    chapterOutline: components.find((c) => c.name === 'chapterOutline')!.content as ChapterOutline,
    volumeOutline: components.find((c) => c.name === 'volumeOutline')!.content as VolumeOutline,
    novelOutline: components.find((c) => c.name === 'novelOutline')!.content as NovelOutline,
    relevantCharacters: components.find((c) => c.name === 'relevantCharacters')!.content as Character[],
    relevantLocations: components.find((c) => c.name === 'relevantLocations')!.content as Location[],
    recentChapters: components.find((c) => c.name === 'recentChapters')!.content as Chapter[],
    chapterSummaries: components.find((c) => c.name === 'chapterSummaries')!.content as ChapterSummary[],
    worldState: components.find((c) => c.name === 'worldState')!.content as WorldState,
    relevantHooks: components.find((c) => c.name === 'relevantHooks')!.content as Hook[],
    estimatedTokens: totalTokens,
  };

  // 7. 记录组装信息
  const duration = Date.now() - startTime;
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '上下文组装完成',
      context: {
        chapter: `${chapterMeta.volume}-${chapterMeta.chapter}`,
        estimatedTokens: totalTokens,
        duration: `${duration}ms`,
        components: components.map((c) => ({
          name: c.name,
          tokens: c.tokens,
          priority: c.priority,
        })),
      },
    },
  });

  return { context, effects };
}

/**
 * 加载章节大纲
 */
function loadChapterOutline(
  chapterMeta: { volume: number; chapter: number },
  _project: Project
): ChapterOutline {
  // 在实际实现中,这里会从文件系统读取
  // 现在返回模拟数据
  return {
    volume: chapterMeta.volume,
    chapter: chapterMeta.chapter,
    title: `第${chapterMeta.chapter}章`,
    function: '推进情节',
    scenes: [],
    emotionalTone: { start: '平静', end: '紧张' },
    hooksToPlant: [],
    hooksToResolve: [],
    stateChanges: [],
  };
}

/**
 * 加载卷大纲
 */
function loadVolumeOutline(volume: number, _project: Project): VolumeOutline {
  return {
    volume,
    title: `第${volume}卷`,
    coreTask: '核心任务',
    endingState: '结束状态',
    chapters: [],
  };
}

/**
 * 加载全书大纲
 */
function loadNovelOutline(_project: Project): NovelOutline {
  return {
    title: _project.projectName,
    theme: '主题',
    coreQuestion: '核心问题',
    emotionalArc: '情感弧线',
  };
}

/**
 * 加载相关角色
 */
function loadRelevantCharacters(
  chapterOutline: ChapterOutline,
  _project: Project
): Character[] {
  // 从章节大纲的场景中提取涉及的角色ID
  const characterIds = new Set<string>();
  for (const scene of chapterOutline.scenes) {
    scene.characters.forEach((id) => characterIds.add(id));
  }

  // 在实际实现中,这里会从文件系统读取角色档案
  return [];
}

/**
 * 加载相关地点
 */
function loadRelevantLocations(
  chapterOutline: ChapterOutline,
  _project: Project
): Location[] {
  // 从章节大纲的场景中提取涉及的地点ID
  const locationIds = new Set<string>();
  for (const scene of chapterOutline.scenes) {
    locationIds.add(scene.location);
  }

  // 在实际实现中,这里会从文件系统读取地点档案
  return [];
}

/**
 * 加载前3章完整内容
 */
function loadRecentChapters(currentChapter: number, _project: Project): Chapter[] {
  const recentChapters: Chapter[] = [];
  const startChapter = Math.max(1, currentChapter - 3);

  for (let i = startChapter; i < currentChapter; i++) {
    // 在实际实现中,这里会从文件系统读取章节文件
    // 现在返回空数组
  }

  return recentChapters;
}

/**
 * 加载第4-10章摘要
 */
function loadChapterSummaries(
  currentChapter: number,
  _project: Project
): ChapterSummary[] {
  const summaries: ChapterSummary[] = [];

  // 滑动窗口: 第4-10章
  const startChapter = Math.max(1, currentChapter - 10);
  const endChapter = Math.max(1, currentChapter - 3);

  for (let i = startChapter; i < endChapter; i++) {
    // 在实际实现中,这里会从chapters/summaries/目录读取摘要文件
  }

  return summaries;
}

/**
 * 加载世界状态
 */
function loadWorldState(_project: Project): WorldState {
  // 在实际实现中,这里会从world/world-state.yaml读取
  return {
    characters: {},
    locations: {},
    timeline: [],
    hooks: {},
    worldRules: [],
    lastUpdatedChapter: '',
  };
}

/**
 * 加载相关伏笔
 */
function loadRelevantHooks(
  chapterOutline: ChapterOutline,
  worldState: WorldState
): Hook[] {
  const relevantHookIds = new Set([
    ...chapterOutline.hooksToPlant,
    ...chapterOutline.hooksToResolve,
  ]);

  return Object.values(worldState.hooks).filter((hook) =>
    relevantHookIds.has(hook.id)
  );
}

/**
 * 裁剪内容
 */
function trimContent(content: unknown, maxTokens: number): unknown | null {
  if (Array.isArray(content)) {
    // 数组类型: 截取前N项
    let tokens = 0;
    const result = [];
    for (const item of content) {
      const itemTokens = estimateTokens(JSON.stringify(item));
      if (tokens + itemTokens > maxTokens) break;
      result.push(item);
      tokens += itemTokens;
    }
    return result.length > 0 ? result : null;
  }

  if (typeof content === 'string') {
    // 字符串类型: 截取前N个字符
    const maxChars = maxTokens * 4;
    return content.length > maxChars
      ? content.substring(0, maxChars) + '...'
      : content;
  }

  if (typeof content === 'object' && content !== null) {
    // 对象类型: 尝试保留部分字段
    const str = JSON.stringify(content);
    const tokens = estimateTokens(str);
    if (tokens <= maxTokens) {
      return content;
    }
    // 无法智能裁剪对象,返回null
    return null;
  }

  return null;
}

/**
 * 获取空内容(当组件被移除时)
 */
function getEmptyContent(name: string): unknown {
  switch (name) {
    case 'relevantCharacters':
    case 'relevantLocations':
    case 'recentChapters':
    case 'chapterSummaries':
    case 'relevantHooks':
      return [];
    case 'worldState':
      return {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: '',
      };
    default:
      return null;
  }
}
