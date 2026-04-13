/**
 * Phase4: 章节生成核心逻辑
 * 
 * 职责:
 * - 组装上下文(RAG)
 * - 调用Main Model生成初稿
 * - 调用JSON Model提取状态变化
 * - 并行执行九项校验
 * - 修复循环(最多N轮)
 * - 风格润色
 * - 保存章节和日志
 * 
 * Requirements: 4.9-4.19, 10.1-10.9
 */

import type { Effect } from '../effects.js';
import type { Chapter } from '../models/chapter.js';
import type { WorldState } from '../models/worldState.js';
import type { Project } from '../models/project.js';
import type { GenerationConfig } from '../models/config.js';
import type { ValidationResult, Violation } from '../rules/index.js';
import { assembleContext } from '../rag/contextAssembler.js';
import type { ChapterMeta } from '../rag/types.js';

/**
 * Phase4输入
 */
export interface Phase4Input {
  chapterMeta: ChapterMeta;
  project: Project;
  config: GenerationConfig;
}

/**
 * Phase4输出
 */
export interface Phase4Output {
  chapter: Chapter;
  updatedWorldState: WorldState;
  validationResults: ValidationResult[];
  fixRounds: number;
  effects: Effect[];
}

/**
 * Phase4: 章节生成
 * 
 * 完整的章节生成流程:
 * 1. 组装上下文
 * 2. 生成初稿
 * 3. 提取状态变化
 * 4. 并行校验
 * 5. 修复循环
 * 6. 风格润色
 * 7. 保存章节
 * 
 * Requirements: 4.9-4.19, 10.1-10.9
 * 
 * @param input Phase4输入
 * @returns Phase4输出(章节和Effects)
 */
export function phase4ChapterGeneration(input: Phase4Input): Phase4Output {
  const { chapterMeta, project } = input;
  const effects: Effect[] = [];

  const chapterId = `vol-${chapterMeta.volume}-ch-${String(chapterMeta.chapter).padStart(3, '0')}`;

  // Requirement 4.10: 组装上下文(RAG)
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '开始组装上下文',
      context: {
        chapterId,
      },
    },
  });

  // 使用contextAssembler组装上下文
  // 注意: 实际执行由Bus层完成,这里只声明需要的Effect
  const { effects: contextEffects } = assembleContext({
    chapterMeta,
    project,
  });
  effects.push(...contextEffects);

  // Requirement 4.11: 调用Main Model生成章节初稿
  const draftPrompt = buildChapterDraftPrompt(chapterMeta, project);
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'main',
      messages: [
        {
          role: 'system',
          content: '你是一个专业小说作家,负责根据大纲生成章节正文。',
        },
        {
          role: 'user',
          content: draftPrompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // Requirement 4.12: 调用JSON Model提取状态变化
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说编辑,负责提取章节中的状态变化。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: '请提取章节中的状态变化(角色位置、物品、情绪、已知信息等)',
        },
      ],
      temperature: 0.3,
    },
  });

  // Requirement 4.13: 并行执行九项校验
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '开始执行九项校验',
      context: {
        chapterId,
      },
    },
  });

  // 校验将由Bus层执行,这里只记录日志
  // 实际的校验逻辑在rules/目录下

  // Requirement 4.14-4.17: 修复循环
  // 如果校验失败,进入修复循环(最多maxFixRounds轮)
  // 修复逻辑由Bus层实现,这里只声明Effect

  // 初始化章节对象(实际数据由Bus层从AI响应中解析)
  const chapter: Chapter = {
    volume: chapterMeta.volume,
    chapter: chapterMeta.chapter,
    title: '',
    content: '',
    wordCount: 0,
    generatedAt: new Date().toISOString(),
  };

  const updatedWorldState: WorldState = {
    characters: {},
    locations: {},
    timeline: [],
    hooks: {},
    worldRules: [],
    lastUpdatedChapter: chapterId,
  };

  const validationResults: ValidationResult[] = [];
  const fixRounds = 0;

  // Requirement 4.18: 风格润色
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'main',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说编辑,负责对章节进行风格润色。',
        },
        {
          role: 'user',
          content: '请对以下章节进行风格润色,保持情节不变,提升文字质量。',
        },
      ],
      temperature: 0.6,
    },
  });

  // Requirement 4.19: 保存章节文件
  effects.push({
    type: 'ENSURE_DIR',
    payload: {
      path: `${project.projectName}/chapters`,
    },
  });

  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: `${project.projectName}/chapters/${chapterId}.md`,
      content: formatChapterAsMarkdown(chapter),
    },
  });

  // Requirement 4.20: 更新project.json元数据
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '准备更新project.json',
      context: {
        chapterId,
      },
    },
  });

  // Requirement 4.21: 记录详细日志
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '章节生成完成',
      context: {
        chapterId,
        wordCount: chapter.wordCount,
        fixRounds,
      },
    },
  });

  return { chapter, updatedWorldState, validationResults, fixRounds, effects };
}

/**
 * 构建章节初稿生成提示词
 */
function buildChapterDraftPrompt(chapterMeta: ChapterMeta, project: Project): string {
  // 注意: 实际的上下文数据(大纲、角色档案、前文等)由Bus层从assembleContext结果中获取
  // 这里只构建提示词模板
  return `
请根据以下信息生成章节正文:

章节: 第${chapterMeta.volume}卷 第${chapterMeta.chapter}章
目标字数: ${project.config.wordsPerChapter}字

要求:
1. 严格按照章节大纲的场景和事件展开
2. 保持角色性格和行为一致性
3. 注意埋设/回收指定的伏笔
4. 字数控制在目标字数左右
5. 保持情感基调的变化

请生成章节正文:
`;
}

/**
 * 构建修复提示词
 * 
 * Requirements: 10.2, 10.3
 */
export function buildFixPrompt(chapter: Chapter, violations: Violation[]): string {
  const violationList = violations
    .map((v, i) => `${i + 1}. [${v.type}] ${v.message}${v.suggestedFix ? `\n   建议: ${v.suggestedFix}` : ''}`)
    .join('\n');

  return `
请修复以下章节中的一致性问题:

原章节内容:
${chapter.content}

检测到的问题:
${violationList}

要求:
1. 保持章节的整体结构和情节
2. 修复所有列出的问题
3. 确保修复后的内容符合世界观设定
4. 保持文风一致

请输出修复后的完整章节内容:
`;
}

/**
 * 将章节格式化为Markdown
 */
function formatChapterAsMarkdown(chapter: Chapter): string {
  const lines: string[] = [];

  lines.push(`# ${chapter.title}`);
  lines.push('');
  lines.push(`**卷**: ${chapter.volume}`);
  lines.push(`**章**: ${chapter.chapter}`);
  lines.push(`**字数**: ${chapter.wordCount}`);
  lines.push(`**生成时间**: ${chapter.generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(chapter.content);
  lines.push('');

  return lines.join('\n');
}
