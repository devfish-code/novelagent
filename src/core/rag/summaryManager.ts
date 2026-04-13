/**
 * 摘要管理器
 * 
 * 职责:
 * - 为历史章节生成精简摘要
 * - 提取关键事件、角色动作、状态变化
 * - 实现滑动窗口策略(前3章完整+第4-10章摘要)
 * 
 * Requirements: 22.1-22.12
 */

import type { Effect } from '../effects.js';
import type {
  SummaryManagerInput,
  SummaryConfig,
} from './types.js';
import type { ChapterSummary } from '../models/chapter.js';
import type { StateChange } from '../models/outline.js';

/**
 * 生成章节摘要
 * 
 * 策略:
 * - 当章节序号 > 3时生成摘要
 * - 提取关键事件、角色动作、状态变化
 * - 摘要长度为原文的10%-20%
 * - 保存到chapters/summaries/{章节ID}-summary.md
 * 
 * Requirements: 22.1-22.12
 * 
 * @param input 摘要管理器输入
 * @returns 章节摘要和需要执行的Effects
 */
export function generateSummary(
  input: SummaryManagerInput
): { summary: ChapterSummary; effects: Effect[] } {
  const { chapter, config } = input;
  const effects: Effect[] = [];

  // Requirement 22.1: 判断是否需要生成摘要
  if (!shouldGenerateSummary(chapter.chapter)) {
    // 不需要生成摘要,返回空结果
    return {
      summary: {
        chapterId: `vol-${chapter.volume}-ch-${String(chapter.chapter).padStart(3, '0')}`,
        keyEvents: [],
        characterActions: {},
        stateChanges: [],
        wordCount: chapter.wordCount,
        summaryLength: 0,
      },
      effects: [],
    };
  }

  // 1. 构建章节ID
  const chapterId = `vol-${chapter.volume}-ch-${String(chapter.chapter).padStart(3, '0')}`;

  // Requirement 22.10: 记录摘要生成时间和原文长度到日志
  const startTime = new Date().toISOString();
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '开始生成章节摘要',
      context: {
        chapterId,
        wordCount: chapter.wordCount,
        startTime,
      },
    },
  });

  // 2. 构建AI提示词
  const prompt = buildSummaryPrompt(chapter, config);

  // Requirement 22.3: 调用Main_Model提取关键事件、角色动作、状态变化
  // 注意: 这里使用'json'模型而不是'main'模型,因为需要结构化输出
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'json',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的小说编辑,负责为章节生成精简摘要。请严格按照JSON格式输出。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // 低温度,确保输出稳定
    },
  });

  // 3. 计算摘要长度(基于配置的比例)
  // Requirement 22.4: 限制摘要长度为原文的10%-20%
  // Requirement 22.11: 使用配置的摘要长度比例
  const targetSummaryLength = Math.floor(
    chapter.wordCount * config.summaryLengthRatio
  );

  // 4. 构建摘要对象
  // 注意: 在实际执行时,Bus层会从AI响应中解析这些数据
  // 这里返回的是结构模板,实际数据由AI生成
  const summary: ChapterSummary = {
    chapterId,
    keyEvents: [], // 将由AI填充
    characterActions: {}, // 将由AI填充
    stateChanges: [], // 将由AI填充
    wordCount: chapter.wordCount,
    summaryLength: targetSummaryLength,
  };

  // Requirement 22.5: 保存到chapters/summaries/{章节ID}-summary.md文件
  const summaryPath = `chapters/summaries/${chapterId}-summary.md`;
  
  // 确保目录存在
  effects.push({
    type: 'ENSURE_DIR',
    payload: {
      path: 'chapters/summaries',
    },
  });

  // 保存摘要文件
  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: summaryPath,
      content: formatSummaryAsMarkdown(summary),
    },
  });

  // Requirement 22.10: 记录摘要生成完成
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '章节摘要生成完成',
      context: {
        chapterId,
        wordCount: chapter.wordCount,
        summaryLength: summary.summaryLength,
        ratio: summary.summaryLength / chapter.wordCount,
        summaryPath,
      },
    },
  });

  return { summary, effects };
}

/**
 * 构建摘要生成提示词
 */
function buildSummaryPrompt(
  chapter: { content: string; title: string },
  config: SummaryConfig
): string {
  const targetRatio = config.summaryLengthRatio * 100;

  return `
请为以下章节生成摘要,提取关键信息:

章节标题: ${chapter.title}

章节内容:
${chapter.content}

要求:
1. 提取关键事件(3-5个最重要的事件)
2. 记录每个角色的主要动作(按角色ID分组)
3. 记录状态变化(位置、物品、情绪等)
4. 摘要长度控制在原文的${targetRatio}%左右

输出JSON格式:
{
  "keyEvents": [
    "事件1描述",
    "事件2描述",
    "事件3描述"
  ],
  "characterActions": {
    "char_001": ["动作1", "动作2"],
    "char_002": ["动作1", "动作2"]
  },
  "stateChanges": [
    {
      "entityType": "character",
      "entityId": "char_001",
      "property": "location",
      "newValue": "loc_beijing",
      "reason": "乘坐火车前往北京"
    },
    {
      "entityType": "character",
      "entityId": "char_001",
      "property": "emotion",
      "newValue": "焦虑",
      "reason": "担心即将到来的考试"
    }
  ]
}

注意:
- keyEvents应该是最重要的情节点,不要包含细节描述
- characterActions应该是角色的关键行为,不要包含对话内容
- stateChanges应该记录所有重要的状态变化,包括位置、物品、情绪、健康等
`;
}

/**
 * 将摘要格式化为Markdown
 */
function formatSummaryAsMarkdown(summary: ChapterSummary): string {
  const lines: string[] = [];

  lines.push(`# 章节摘要: ${summary.chapterId}`);
  lines.push('');
  lines.push(`**原文字数**: ${summary.wordCount}`);
  lines.push(`**摘要长度**: ${summary.summaryLength}`);
  lines.push('');

  // 关键事件
  lines.push('## 关键事件');
  lines.push('');
  if (summary.keyEvents.length > 0) {
    summary.keyEvents.forEach((event, index) => {
      lines.push(`${index + 1}. ${event}`);
    });
  } else {
    lines.push('无');
  }
  lines.push('');

  // 角色动作
  lines.push('## 角色动作');
  lines.push('');
  const characterIds = Object.keys(summary.characterActions);
  if (characterIds.length > 0) {
    characterIds.forEach((charId) => {
      lines.push(`### ${charId}`);
      lines.push('');
      summary.characterActions[charId].forEach((action) => {
        lines.push(`- ${action}`);
      });
      lines.push('');
    });
  } else {
    lines.push('无');
    lines.push('');
  }

  // 状态变化
  lines.push('## 状态变化');
  lines.push('');
  if (summary.stateChanges.length > 0) {
    summary.stateChanges.forEach((change) => {
      const stateChange = change as StateChange;
      lines.push(
        `- **${stateChange.entityType}** \`${stateChange.entityId}\`: ${stateChange.property} → ${JSON.stringify(stateChange.newValue)} (${stateChange.reason})`
      );
    });
  } else {
    lines.push('无');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * 判断是否需要生成摘要
 * 
 * Requirement 22.1, 22.2: 当章节序号 > 3时生成摘要
 * 
 * @param chapterNumber 章节号
 * @returns 是否需要生成摘要
 */
export function shouldGenerateSummary(chapterNumber: number): boolean {
  return chapterNumber > 3;
}

/**
 * 选择用于上下文的章节
 * 
 * Requirement 22.8, 22.9: 滑动窗口策略
 * - 前3章: 完整内容
 * - 第4-10章: 摘要
 * - 第11章以后: 仅包含第(当前-10)到(当前-4)章的摘要
 * 
 * @param currentChapter 当前章节号
 * @param totalChapters 总章节数(未使用,保留用于未来扩展)
 * @returns 需要完整内容的章节号和需要摘要的章节号
 */
export function selectChaptersForContext(
  currentChapter: number,
  _totalChapters: number
): {
  fullContentChapters: number[];
  summaryChapters: number[];
} {
  const fullContentChapters: number[] = [];
  const summaryChapters: number[] = [];

  // Requirement 22.8: 前3章完整内容
  // 计算完整内容的起始章节(当前章节的前3章)
  const fullStart = Math.max(1, currentChapter - 3);
  for (let i = fullStart; i < currentChapter; i++) {
    fullContentChapters.push(i);
  }

  // Requirement 22.8, 22.9: 第4-10章摘要
  // 计算摘要的起始章节(当前章节的前10章)
  const summaryStart = Math.max(1, currentChapter - 10);
  // 摘要的结束章节(当前章节的前4章,因为前3章用完整内容)
  const summaryEnd = Math.max(1, currentChapter - 3);
  
  for (let i = summaryStart; i < summaryEnd; i++) {
    summaryChapters.push(i);
  }

  return { fullContentChapters, summaryChapters };
}

/**
 * 加载章节摘要
 * 
 * Requirement 22.6, 22.7: 读取摘要文件,如果不存在则跳过
 * 
 * @param chapterIds 章节ID列表
 * @returns 加载摘要的Effects和摘要占位符
 */
export function loadSummaries(chapterIds: string[]): {
  effects: Effect[];
  summaryPlaceholders: ChapterSummary[];
} {
  const effects: Effect[] = [];
  const summaryPlaceholders: ChapterSummary[] = [];

  for (const chapterId of chapterIds) {
    const summaryPath = `chapters/summaries/${chapterId}-summary.md`;

    // Requirement 22.6: 读取摘要文件
    effects.push({
      type: 'READ_FILE',
      payload: {
        path: summaryPath,
      },
    });

    // 创建占位符(实际数据由Bus层从文件中解析)
    summaryPlaceholders.push({
      chapterId,
      keyEvents: [],
      characterActions: {},
      stateChanges: [],
      wordCount: 0,
      summaryLength: 0,
    });
  }

  // Requirement 22.7: 如果文件不存在,Bus层会处理错误并跳过
  effects.push({
    type: 'LOG_DEBUG',
    payload: {
      message: '加载章节摘要',
      context: {
        chapterIds,
        count: chapterIds.length,
      },
    },
  });

  return { effects, summaryPlaceholders };
}
