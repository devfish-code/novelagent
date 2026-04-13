/**
 * Phase5: 全书校验
 * 
 * 职责:
 * - 全书一致性扫描
 * - 节奏审查
 * - 生成质量报告(统计、错误记录、AI调用统计)
 * 
 * Requirements: 4.23, 4.24
 */

import type { Effect } from '../effects.js';
import type { Project } from '../models/project.js';

/**
 * 质量报告
 */
export interface QualityReport {
  projectName: string;
  generatedAt: string;
  
  // 章节统计
  chapterStats: {
    totalChapters: number;
    completedChapters: number;
    failedChapters: number;
  };
  
  // 字数统计
  wordStats: {
    totalWords: number;
    averageWordsPerChapter: number;
    minWords: number;
    maxWords: number;
  };
  
  // 校验错误记录
  validationErrors: {
    errorType: string;
    count: number;
    locations: string[];
  }[];
  
  // 生成时间信息
  timeStats: {
    startTime: string;
    endTime: string;
    totalDuration: string;
  };
  
  // 修复循环统计
  fixStats: {
    totalFixRounds: number;
    averageFixRoundsPerChapter: number;
    failedFixChapters: string[];
  };
  
  // AI调用统计
  aiStats: {
    totalCalls: number;
    totalTokens: number;
    averageTokensPerCall: number;
  };
}

/**
 * Phase5输入
 */
export interface Phase5Input {
  project: Project;
}

/**
 * Phase5输出
 */
export interface Phase5Output {
  report: QualityReport;
  effects: Effect[];
}

/**
 * Phase5: 全书校验
 * 
 * 生成质量报告
 * 
 * Requirements: 4.23, 4.24
 * 
 * @param input Phase5输入
 * @returns Phase5输出(质量报告和Effects)
 */
export function phase5FinalValidation(input: Phase5Input): Phase5Output {
  const { project } = input;
  const effects: Effect[] = [];

  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: '开始Phase5全书校验',
      context: {
        projectName: project.projectName,
      },
    },
  });

  // Requirement 4.23: 生成质量报告
  const report = generateQualityReport(project);

  // Requirement 4.24: 保存报告到report.md
  const reportMarkdown = formatReportAsMarkdown(report);
  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: `${project.projectName}/report.md`,
      content: reportMarkdown,
    },
  });

  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: 'Phase5全书校验完成',
      context: {
        projectName: project.projectName,
        totalChapters: report.chapterStats.totalChapters,
        totalWords: report.wordStats.totalWords,
      },
    },
  });

  return { report, effects };
}

/**
 * 生成质量报告
 * 
 * Requirements: 4.23, 4.24
 */
function generateQualityReport(project: Project): QualityReport {
  // 章节统计
  const completedChapters = project.chapters.filter((c) => c.status === 'completed');
  const failedChapters = project.chapters.filter((c) => c.status === 'failed');

  // 字数统计
  const wordCounts = completedChapters.map((c) => c.wordCount);
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
  const averageWords = completedChapters.length > 0 ? totalWords / completedChapters.length : 0;
  const minWords = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
  const maxWords = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;

  // 修复循环统计
  const fixRounds = completedChapters.map((c) => c.fixRounds || 0);
  const totalFixRounds = fixRounds.reduce((sum, rounds) => sum + rounds, 0);
  const averageFixRounds = completedChapters.length > 0 ? totalFixRounds / completedChapters.length : 0;
  const failedFixChapters = completedChapters
    .filter((c) => (c.fixRounds || 0) >= 3)
    .map((c) => `vol-${c.volume}-ch-${String(c.chapter).padStart(3, '0')}`);

  // AI调用统计
  const totalCalls = project.statistics.totalAICalls;
  const totalTokens = project.statistics.totalTokens;
  const averageTokens = totalCalls > 0 ? totalTokens / totalCalls : 0;

  // 时间统计
  const startTime = project.createdAt;
  const endTime = project.updatedAt;
  const duration = calculateDuration(startTime, endTime);

  return {
    projectName: project.projectName,
    generatedAt: new Date().toISOString(),
    
    chapterStats: {
      totalChapters: project.chapters.length,
      completedChapters: completedChapters.length,
      failedChapters: failedChapters.length,
    },
    
    wordStats: {
      totalWords,
      averageWordsPerChapter: Math.round(averageWords),
      minWords,
      maxWords,
    },
    
    validationErrors: [], // 将由Bus层从日志中提取
    
    timeStats: {
      startTime,
      endTime,
      totalDuration: duration,
    },
    
    fixStats: {
      totalFixRounds,
      averageFixRoundsPerChapter: Math.round(averageFixRounds * 100) / 100,
      failedFixChapters,
    },
    
    aiStats: {
      totalCalls,
      totalTokens,
      averageTokensPerCall: Math.round(averageTokens),
    },
  };
}

/**
 * 计算时长
 */
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

  return `${hours}小时${minutes}分钟${seconds}秒`;
}

/**
 * 将质量报告格式化为Markdown
 */
function formatReportAsMarkdown(report: QualityReport): string {
  const lines: string[] = [];

  lines.push(`# 生成报告 - ${report.projectName}`);
  lines.push('');
  lines.push(`**生成时间**: ${report.generatedAt}`);
  lines.push('');

  // 章节统计
  lines.push('## 章节统计');
  lines.push('');
  lines.push(`- 总章节数: ${report.chapterStats.totalChapters}`);
  lines.push(`- 已完成: ${report.chapterStats.completedChapters}`);
  lines.push(`- 失败: ${report.chapterStats.failedChapters}`);
  lines.push('');

  // 字数统计
  lines.push('## 字数统计');
  lines.push('');
  lines.push(`- 总字数: ${report.wordStats.totalWords}`);
  lines.push(`- 平均每章字数: ${report.wordStats.averageWordsPerChapter}`);
  lines.push(`- 最少字数: ${report.wordStats.minWords}`);
  lines.push(`- 最多字数: ${report.wordStats.maxWords}`);
  lines.push('');

  // 校验错误记录
  lines.push('## 校验错误记录');
  lines.push('');
  if (report.validationErrors.length > 0) {
    report.validationErrors.forEach((error) => {
      lines.push(`### ${error.errorType}`);
      lines.push('');
      lines.push(`- 错误数量: ${error.count}`);
      lines.push(`- 位置: ${error.locations.join(', ')}`);
      lines.push('');
    });
  } else {
    lines.push('无校验错误');
    lines.push('');
  }

  // 生成时间信息
  lines.push('## 生成时间信息');
  lines.push('');
  lines.push(`- 开始时间: ${report.timeStats.startTime}`);
  lines.push(`- 结束时间: ${report.timeStats.endTime}`);
  lines.push(`- 总耗时: ${report.timeStats.totalDuration}`);
  lines.push('');

  // 修复循环统计
  lines.push('## 修复循环统计');
  lines.push('');
  lines.push(`- 总修复次数: ${report.fixStats.totalFixRounds}`);
  lines.push(`- 平均每章修复次数: ${report.fixStats.averageFixRoundsPerChapter}`);
  if (report.fixStats.failedFixChapters.length > 0) {
    lines.push(`- 修复失败章节: ${report.fixStats.failedFixChapters.join(', ')}`);
  } else {
    lines.push('- 修复失败章节: 无');
  }
  lines.push('');

  // AI调用统计
  lines.push('## AI调用统计');
  lines.push('');
  lines.push(`- 总调用次数: ${report.aiStats.totalCalls}`);
  lines.push(`- 总Token消耗: ${report.aiStats.totalTokens}`);
  lines.push(`- 平均每次调用Token: ${report.aiStats.averageTokensPerCall}`);
  lines.push('');

  return lines.join('\n');
}
