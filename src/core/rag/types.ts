/**
 * RAG上下文组装相关类型定义
 */

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

/**
 * 章节元数据
 */
export interface ChapterMeta {
  volume: number;
  chapter: number;
}

/**
 * 上下文组装器输入
 */
export interface ContextAssemblerInput {
  chapterMeta: ChapterMeta;
  project: Project;
}

/**
 * 组装后的上下文
 */
export interface AssembledContext {
  chapterOutline: ChapterOutline;
  volumeOutline: VolumeOutline;
  novelOutline: NovelOutline;
  relevantCharacters: Character[];
  relevantLocations: Location[];
  recentChapters: Chapter[]; // 前3章完整内容
  chapterSummaries: ChapterSummary[]; // 第4-10章摘要
  worldState: WorldState;
  relevantHooks: Hook[];
  estimatedTokens: number;
}

/**
 * 上下文组件(用于优先级排序)
 */
export interface ContextComponent {
  priority: number;
  name: keyof Omit<AssembledContext, 'estimatedTokens'>;
  content: unknown;
  tokens: number;
  canTrim: boolean;
}

/**
 * 摘要管理器输入
 */
export interface SummaryManagerInput {
  chapter: Chapter;
  config: SummaryConfig;
}

/**
 * 摘要配置
 */
export interface SummaryConfig {
  summaryLengthRatio: number; // 摘要长度比例 (0.1-0.2)
}
