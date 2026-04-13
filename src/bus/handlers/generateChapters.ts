/**
 * GENERATE_CHAPTERS handler
 * 实现断点续传、章节范围过滤、循环调用Phase4生成每章
 */

import type { AppContext } from '../effectRunner.js';
import { runEffects, runEffect } from '../effectRunner.js';
import { AppError } from '../../core/errors.js';
import { phase4ChapterGeneration } from '../../core/usecases/phase4ChapterGeneration.js';
import type { Project } from '../../core/models/project.js';
import type { ChapterMetadata } from '../../core/models/chapter.js';
import type { ChapterMeta } from '../../core/rag/types.js';
import path from 'path';

export interface GenerateChaptersInput {
  projectName: string;
  dir: string;
  volume?: number;
  startChapter?: number;
  endChapter?: number;
  specificChapter?: number;
  force: boolean;
}

export interface GenerateChaptersOutput {
  completedChapters: number;
  message: string;
}

/**
 * 生成章节handler
 * 
 * Requirements: 4.1-4.26
 */
export async function generateChaptersHandler(
  ctx: AppContext,
  input: GenerateChaptersInput
): Promise<GenerateChaptersOutput> {
  const projectPath = path.join(input.dir, input.projectName);

  // Requirement 4.2: 检查项目是否存在
  const projectExists = await ctx.storage.fileExists(projectPath);
  if (!projectExists) {
    throw new AppError(
      'PROJECT_NOT_FOUND',
      '项目不存在',
      {
        path: projectPath,
        suggestion: '请先运行 framework 命令生成小说框架',
      }
    );
  }

  // 读取project.json
  const projectJsonPath = path.join(projectPath, 'project.json');
  const projectJsonContent = await ctx.storage.readFile(projectJsonPath);
  const project: Project = JSON.parse(projectJsonContent);

  // Requirement 4.3: 计算待生成章节范围(断点续传)
  const chaptersToGenerate = calculateChapterRange(project, input);

  if (chaptersToGenerate.length === 0) {
    return {
      completedChapters: 0,
      message: '没有需要生成的章节',
    };
  }

  ctx.logger.info('开始生成章节', {
    totalChapters: chaptersToGenerate.length,
    chapters: chaptersToGenerate.map((c) => `${c.volume}-${c.chapter}`),
  });

  let completedCount = 0;

  // Requirement 4.9: 按顺序执行Phase4生成流程
  for (const chapterMeta of chaptersToGenerate) {
    const chapterId = `vol-${chapterMeta.volume}-ch-${String(chapterMeta.chapter).padStart(3, '0')}`;

    try {
      // Requirement 4.22: 显示进度
      await runEffect(ctx, {
        type: 'SHOW_PROGRESS',
        payload: {
          current: completedCount + 1,
          total: chaptersToGenerate.length,
          message: `生成章节: ${chapterId}`,
        },
      });

      ctx.logger.info(`开始生成章节: ${chapterId}`);

      // 调用Phase4生成章节
      const phase4Output = phase4ChapterGeneration({
        chapterMeta: {
          volume: chapterMeta.volume,
          chapter: chapterMeta.chapter,
        },
        project,
        config: {
          volumes: project.config.volumes,
          chaptersPerVolume: project.config.chaptersPerVolume,
          wordsPerChapter: project.config.wordsPerChapter,
          maxFixRounds: 3,
        },
      });

      // 执行Phase4返回的Effects
      await runEffects(ctx, phase4Output.effects);

      // Requirement 4.20: 更新project.json
      const chapterMetadata: ChapterMetadata = {
        volume: chapterMeta.volume,
        chapter: chapterMeta.chapter,
        title: phase4Output.chapter.title,
        wordCount: phase4Output.chapter.wordCount,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        fixRounds: phase4Output.fixRounds,
      };

      // 更新或添加章节元数据
      const existingIndex = project.chapters.findIndex(
        (c) => c.volume === chapterMeta.volume && c.chapter === chapterMeta.chapter
      );

      if (existingIndex >= 0) {
        project.chapters[existingIndex] = chapterMetadata;
      } else {
        project.chapters.push(chapterMetadata);
      }

      // 更新进度和统计
      project.progress.completedChapters = project.chapters.filter(
        (c) => c.status === 'completed'
      ).length;
      project.progress.currentPhase = 'phase4';
      project.statistics.totalWords += phase4Output.chapter.wordCount;
      project.statistics.totalFixRounds += phase4Output.fixRounds;
      project.updatedAt = new Date().toISOString();

      // Requirement 4.25: 保存进度(断点续传)
      await runEffect(ctx, {
        type: 'SAVE_FILE',
        payload: {
          path: projectJsonPath,
          content: JSON.stringify(project, null, 2),
        },
      });

      completedCount++;
      ctx.logger.info(`章节生成完成: ${chapterId}`, {
        wordCount: phase4Output.chapter.wordCount,
        fixRounds: phase4Output.fixRounds,
      });
    } catch (error) {
      ctx.logger.error(`章节生成失败: ${chapterId}`, error as Error);

      // 更新章节状态为失败
      const existingIndex = project.chapters.findIndex(
        (c) => c.volume === chapterMeta.volume && c.chapter === chapterMeta.chapter
      );

      if (existingIndex >= 0) {
        project.chapters[existingIndex].status = 'failed';
      } else {
        project.chapters.push({
          volume: chapterMeta.volume,
          chapter: chapterMeta.chapter,
          title: '',
          wordCount: 0,
          status: 'failed',
        });
      }

      // 保存失败状态
      await runEffect(ctx, {
        type: 'SAVE_FILE',
        payload: {
          path: projectJsonPath,
          content: JSON.stringify(project, null, 2),
        },
      });

      // 继续生成下一章,不终止整个流程
      await runEffect(ctx, {
        type: 'SHOW_MESSAGE',
        payload: {
          type: 'error',
          message: `章节 ${chapterId} 生成失败,继续下一章`,
        },
      });
    }
  }

  // Requirement 4.23: 所有章节完成后,执行Phase5全书校验
  if (project.progress.completedChapters === project.progress.totalChapters) {
    ctx.logger.info('所有章节已完成,开始Phase5全书校验');
    await runEffect(ctx, {
      type: 'SHOW_MESSAGE',
      payload: {
        type: 'info',
        message: '所有章节已完成,生成质量报告...',
      },
    });

    // Phase5将在后续实现
    // const phase5Output = phase5FinalValidation({ project });
    // await runEffects(ctx, phase5Output.effects);

    project.status = 'completed';
    project.updatedAt = new Date().toISOString();

    await runEffect(ctx, {
      type: 'SAVE_FILE',
      payload: {
        path: projectJsonPath,
        content: JSON.stringify(project, null, 2),
      },
    });
  }

  await runEffect(ctx, {
    type: 'SHOW_MESSAGE',
    payload: {
      type: 'success',
      message: `章节生成完成: ${completedCount}/${chaptersToGenerate.length}`,
    },
  });

  return {
    completedChapters: completedCount,
    message: `已生成 ${completedCount} 个章节`,
  };
}

/**
 * 计算待生成章节范围
 * 
 * Requirements: 4.3-4.8
 */
function calculateChapterRange(
  project: Project,
  input: GenerateChaptersInput
): ChapterMeta[] {
  const allChapters: ChapterMeta[] = [];

  // 生成所有章节的元数据
  for (let v = 1; v <= project.config.volumes; v++) {
    for (let c = 1; c <= project.config.chaptersPerVolume; c++) {
      allChapters.push({ volume: v, chapter: c });
    }
  }

  // Requirement 4.7: 过滤已完成的章节(除非使用--force)
  let pendingChapters = allChapters;
  if (!input.force) {
    const completedChapterIds = new Set(
      project.chapters
        .filter((c) => c.status === 'completed')
        .map((c) => `${c.volume}-${c.chapter}`)
    );

    pendingChapters = allChapters.filter(
      (c) => !completedChapterIds.has(`${c.volume}-${c.chapter}`)
    );
  }

  // Requirement 4.4: 按volume过滤
  if (input.volume !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.volume === input.volume);
  }

  // Requirement 4.5: 按range过滤
  if (input.startChapter !== undefined && input.endChapter !== undefined) {
    pendingChapters = pendingChapters.filter(
      (c) => c.chapter >= input.startChapter! && c.chapter <= input.endChapter!
    );
  }

  // Requirement 4.6: 按specificChapter过滤
  if (input.specificChapter !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.chapter === input.specificChapter);
  }

  // 按顺序排序
  return pendingChapters.sort((a, b) => {
    if (a.volume !== b.volume) return a.volume - b.volume;
    return a.chapter - b.chapter;
  });
}

