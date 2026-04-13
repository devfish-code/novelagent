/**
 * EXPORT_PROJECT handler
 * 导出小说产物(合并章节、生成汇总文档)
 */

import type { AppContext } from '../effectRunner.js';
import { runEffect } from '../effectRunner.js';
import { AppError } from '../../core/errors.js';
import type { Project } from '../../core/models/project.js';
import path from 'path';

export interface ExportProjectInput {
  projectName: string;
  dir: string;
  format: 'markdown' | 'json';
  outputDir?: string;
}

export interface ExportProjectOutput {
  exportPath: string;
  files: string[];
  message: string;
}

/**
 * 导出项目handler
 * 
 * Requirements: 5.1-5.14
 */
export async function exportProjectHandler(
  ctx: AppContext,
  input: ExportProjectInput
): Promise<ExportProjectOutput> {
  const projectPath = path.join(input.dir, input.projectName);

  // Requirement 5.2: 检查项目是否存在
  const projectExists = await ctx.storage.fileExists(projectPath);
  if (!projectExists) {
    throw new AppError(
      'PROJECT_NOT_FOUND',
      '项目不存在',
      {
        path: projectPath,
      }
    );
  }

  // 读取project.json
  const projectJsonPath = path.join(projectPath, 'project.json');
  const projectJsonContent = await ctx.storage.readFile(projectJsonPath);
  const project: Project = JSON.parse(projectJsonContent);

  // Requirement 5.6, 5.7: 确定导出目录
  const exportPath = input.outputDir
    ? path.join(input.dir, input.outputDir)
    : path.join(projectPath, 'exports');

  await runEffect(ctx, {
    type: 'ENSURE_DIR',
    payload: { path: exportPath },
  });

  const exportedFiles: string[] = [];

  // Requirement 5.8: 合并所有章节为novel.md
  ctx.logger.info('合并章节为完整小说');
  const novelContent = await mergeChapters(ctx, project, projectPath);
  const novelPath = path.join(exportPath, 'novel.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: novelPath,
      content: novelContent,
    },
  });
  exportedFiles.push('novel.md');

  // Requirement 5.9: 生成world.md世界观文档汇总
  ctx.logger.info('生成世界观文档');
  const worldContent = await generateWorldDoc(ctx, projectPath);
  const worldPath = path.join(exportPath, 'world.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: worldPath,
      content: worldContent,
    },
  });
  exportedFiles.push('world.md');

  // Requirement 5.10: 生成characters.md角色档案汇总
  ctx.logger.info('生成角色档案汇总');
  const charactersContent = await generateCharactersDoc(ctx, projectPath);
  const charactersPath = path.join(exportPath, 'characters.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: charactersPath,
      content: charactersContent,
    },
  });
  exportedFiles.push('characters.md');

  // Requirement 5.11: 生成outline.md大纲文档
  ctx.logger.info('生成大纲文档');
  const outlineContent = await generateOutlineDoc(ctx, projectPath);
  const outlinePath = path.join(exportPath, 'outline.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: outlinePath,
      content: outlineContent,
    },
  });
  exportedFiles.push('outline.md');

  // Requirement 5.12: 生成timeline.md时间线文档
  ctx.logger.info('生成时间线文档');
  const timelineContent = await generateTimelineDoc(ctx, projectPath);
  const timelinePath = path.join(exportPath, 'timeline.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: timelinePath,
      content: timelineContent,
    },
  });
  exportedFiles.push('timeline.md');

  // Requirement 5.13: 生成report.md生成报告
  ctx.logger.info('生成质量报告');
  const reportContent = generateReportDoc(project);
  const reportPath = path.join(exportPath, 'report.md');
  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: reportPath,
      content: reportContent,
    },
  });
  exportedFiles.push('report.md');

  // Requirement 5.5: 如果格式为json,额外导出JSON格式
  if (input.format === 'json') {
    const jsonPath = path.join(exportPath, 'project-export.json');
    await runEffect(ctx, {
      type: 'SAVE_FILE',
      payload: {
        path: jsonPath,
        content: JSON.stringify(project, null, 2),
      },
    });
    exportedFiles.push('project-export.json');
  }

  await runEffect(ctx, {
    type: 'SHOW_MESSAGE',
    payload: {
      type: 'success',
      message: '导出完成',
    },
  });

  ctx.logger.info('导出完成', {
    exportPath,
    files: exportedFiles,
  });

  return {
    exportPath,
    files: exportedFiles,
    message: `已导出到: ${exportPath}`,
  };
}

/**
 * 合并所有章节为完整小说
 */
async function mergeChapters(
  ctx: AppContext,
  project: Project,
  projectPath: string
): Promise<string> {
  const lines: string[] = [];

  lines.push(`# ${project.projectName}`);
  lines.push('');
  lines.push(`**作者**: NovelAgent`);
  lines.push(`**生成时间**: ${project.createdAt}`);
  lines.push(`**总字数**: ${project.statistics.totalWords}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 按顺序读取所有章节
  const sortedChapters = project.chapters
    .filter((c) => c.status === 'completed')
    .sort((a, b) => {
      if (a.volume !== b.volume) return a.volume - b.volume;
      return a.chapter - b.chapter;
    });

  for (const chapterMeta of sortedChapters) {
    const chapterId = `vol-${chapterMeta.volume}-ch-${String(chapterMeta.chapter).padStart(3, '0')}`;
    const chapterPath = path.join(projectPath, 'chapters', `${chapterId}.md`);

    try {
      const chapterContent = await ctx.storage.readFile(chapterPath);
      lines.push(chapterContent);
      lines.push('');
      lines.push('---');
      lines.push('');
    } catch (error) {
      ctx.logger.error(`读取章节失败: ${chapterId}`, error as Error);
    }
  }

  return lines.join('\n');
}

/**
 * 生成世界观文档
 */
async function generateWorldDoc(ctx: AppContext, projectPath: string): Promise<string> {
  const lines: string[] = [];

  lines.push('# 世界观设定');
  lines.push('');

  try {
    const worldStatePath = path.join(projectPath, 'world', 'world-state.yaml');
    const worldStateContent = await ctx.storage.readFile(worldStatePath);
    lines.push('## 世界状态');
    lines.push('');
    lines.push('```yaml');
    lines.push(worldStateContent);
    lines.push('```');
    lines.push('');
  } catch (error) {
    ctx.logger.error('读取世界状态失败', error as Error);
  }

  return lines.join('\n');
}

/**
 * 生成角色档案汇总
 */
async function generateCharactersDoc(ctx: AppContext, projectPath: string): Promise<string> {
  const lines: string[] = [];

  lines.push('# 角色档案');
  lines.push('');

  try {
    const worldDir = path.join(projectPath, 'world');
    const files = await ctx.storage.listDir(worldDir);

    const characterFiles = files.filter((f) => f.startsWith('character-'));

    for (const file of characterFiles) {
      const filePath = path.join(worldDir, file);
      const content = await ctx.storage.readFile(filePath);
      lines.push(content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  } catch (error) {
    ctx.logger.error('读取角色档案失败', error as Error);
  }

  return lines.join('\n');
}

/**
 * 生成大纲文档
 */
async function generateOutlineDoc(ctx: AppContext, projectPath: string): Promise<string> {
  const lines: string[] = [];

  lines.push('# 小说大纲');
  lines.push('');

  try {
    const novelOutlinePath = path.join(projectPath, 'outline', 'novel.yaml');
    const novelOutlineContent = await ctx.storage.readFile(novelOutlinePath);
    lines.push('## 全书大纲');
    lines.push('');
    lines.push('```yaml');
    lines.push(novelOutlineContent);
    lines.push('```');
    lines.push('');
  } catch (error) {
    ctx.logger.error('读取大纲失败', error as Error);
  }

  return lines.join('\n');
}

/**
 * 生成时间线文档
 */
async function generateTimelineDoc(ctx: AppContext, _projectPath: string): Promise<string> {
  const lines: string[] = [];

  lines.push('# 时间线');
  lines.push('');

  try {
    // const worldStatePath = path.join(projectPath, 'world', 'world-state.yaml');
    // const worldStateContent = await ctx.storage.readFile(worldStatePath);
    // 简化: 这里应该解析YAML并提取timeline字段
    lines.push('时间线信息包含在世界状态中');
    lines.push('');
  } catch (error) {
    ctx.logger.error('读取时间线失败', error as Error);
  }

  return lines.join('\n');
}

/**
 * 生成质量报告
 */
function generateReportDoc(project: Project): string {
  const lines: string[] = [];

  lines.push('# 生成报告');
  lines.push('');

  lines.push('## 基本信息');
  lines.push('');
  lines.push(`- 项目名称: ${project.projectName}`);
  lines.push(`- 创建时间: ${project.createdAt}`);
  lines.push(`- 完成时间: ${project.updatedAt}`);
  lines.push(`- 状态: ${project.status}`);
  lines.push('');

  lines.push('## 章节统计');
  lines.push('');
  lines.push(`- 总章节数: ${project.progress.totalChapters}`);
  lines.push(`- 已完成章节: ${project.progress.completedChapters}`);
  lines.push(`- 完成率: ${((project.progress.completedChapters / project.progress.totalChapters) * 100).toFixed(2)}%`);
  lines.push('');

  lines.push('## 字数统计');
  lines.push('');
  lines.push(`- 总字数: ${project.statistics.totalWords}`);
  lines.push(`- 平均每章字数: ${Math.round(project.statistics.totalWords / project.progress.completedChapters)}`);
  lines.push('');

  lines.push('## 生成统计');
  lines.push('');
  lines.push(`- AI调用次数: ${project.statistics.totalAICalls}`);
  lines.push(`- Token消耗: ${project.statistics.totalTokens}`);
  lines.push(`- 修复循环次数: ${project.statistics.totalFixRounds}`);
  lines.push(`- 平均每章修复次数: ${(project.statistics.totalFixRounds / project.progress.completedChapters).toFixed(2)}`);
  lines.push('');

  lines.push('## 章节详情');
  lines.push('');
  lines.push('| 卷 | 章 | 标题 | 字数 | 状态 | 修复次数 |');
  lines.push('|----|----|----|------|------|---------|');

  project.chapters
    .sort((a, b) => {
      if (a.volume !== b.volume) return a.volume - b.volume;
      return a.chapter - b.chapter;
    })
    .forEach((c) => {
      lines.push(
        `| ${c.volume} | ${c.chapter} | ${c.title} | ${c.wordCount} | ${c.status} | ${c.fixRounds || 0} |`
      );
    });

  lines.push('');

  return lines.join('\n');
}

