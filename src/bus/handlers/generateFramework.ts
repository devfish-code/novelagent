/**
 * GENERATE_FRAMEWORK handler
 * 编排Phase1→Phase2→Phase3的执行,生成小说框架
 */

import type { AppContext } from '../effectRunner.js';
import { runEffects, runEffect } from '../effectRunner.js';
import { AppError } from '../../core/errors.js';
import { phase1UnderstandRequirements } from '../../core/usecases/phase1UnderstandRequirements.js';
import { phase2WorldBuilding } from '../../core/usecases/phase2WorldBuilding.js';
import { phase3OutlinePlanning } from '../../core/usecases/phase3OutlinePlanning.js';
import type { GenerationConfig } from '../../core/models/config.js';
import type { Project } from '../../core/models/project.js';
import path from 'path';

export interface GenerateFrameworkInput {
  creativeDescription: string;
  projectName: string;
  dir: string;
  volumes?: number;
  chaptersPerVolume?: number;
  wordsPerChapter?: number;
}

export interface GenerateFrameworkOutput {
  projectPath: string;
  message: string;
}

/**
 * 生成小说框架handler
 * 
 * Requirements: 3.1-3.16
 */
export async function generateFrameworkHandler(
  ctx: AppContext,
  input: GenerateFrameworkInput
): Promise<GenerateFrameworkOutput> {
  const projectPath = path.join(input.dir, input.projectName);

  // Requirement 3.5: 检查项目是否已存在
  const projectExists = await ctx.storage.fileExists(projectPath);
  if (projectExists) {
    throw new AppError(
      'PROJECT_EXISTS',
      '项目已存在',
      {
        path: projectPath,
        suggestion: '请使用不同的项目名称',
      }
    );
  }

  // Requirement 3.9: 检查创意描述长度
  if (input.creativeDescription.length < 10) {
    ctx.logger.info('警告: 创意描述可能不够详细', {
      length: input.creativeDescription.length,
    });
    await runEffect(ctx, {
      type: 'SHOW_MESSAGE',
      payload: {
        type: 'warning',
        message: '创意描述较短,可能影响生成质量',
      },
    });
  }

  // 构建生成配置
  const config: GenerationConfig = {
    volumes: input.volumes || 3,
    chaptersPerVolume: input.chaptersPerVolume || 10,
    wordsPerChapter: input.wordsPerChapter || 3000,
    maxFixRounds: 3,
  };

  // 创建项目目录
  await runEffect(ctx, {
    type: 'ENSURE_DIR',
    payload: { path: projectPath },
  });

  // Requirement 3.12: 实现重试机制(最多3次)
  const maxRetries = 3;
  let phase1Success = false;
  let phase2Success = false;
  let phase3Success = false;

  // Phase 1: 需求理解
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      ctx.logger.info(`Phase1: 需求理解 (尝试 ${attempt}/${maxRetries})`);
      await runEffect(ctx, {
        type: 'SHOW_PROGRESS',
        payload: {
          current: 1,
          total: 3,
          message: 'Phase1: 分析需求...',
        },
      });

      const phase1Output = phase1UnderstandRequirements({
        creativeDescription: input.creativeDescription,
        projectName: input.projectName,
        config,
      });

      await runEffects(ctx, phase1Output.effects);
      phase1Success = true;
      break;
    } catch (error) {
      ctx.logger.error(`Phase1失败 (尝试 ${attempt}/${maxRetries})`, error as Error);
      if (attempt === maxRetries) {
        throw new AppError(
          'GENERATION_FAILED',
          'Phase1需求理解失败',
          { phase: 'phase1', attempts: maxRetries }
        );
      }
    }
  }

  if (!phase1Success) {
    throw new AppError('GENERATION_FAILED', 'Phase1需求理解失败');
  }

  // Phase 2: 世界构建
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      ctx.logger.info(`Phase2: 世界构建 (尝试 ${attempt}/${maxRetries})`);
      await runEffect(ctx, {
        type: 'SHOW_PROGRESS',
        payload: {
          current: 2,
          total: 3,
          message: 'Phase2: 构建世界观...',
        },
      });

      // 读取requirements.md
      // const requirementsContent = await ctx.storage.readFile(
      //   path.join(projectPath, 'requirements.md')
      // );
      // 简化: 这里应该解析YAML,暂时使用占位符
      const requirements = {
        novelType: '',
        targetAudience: { ageRange: '', readingPreferences: [] },
        coreConflict: { mainContradiction: '', opposingSides: [] },
        theme: '',
        emotionalTone: '',
        storyBackground: { era: '', region: '', socialEnvironment: '' },
        narrativePerspective: '',
        expectedLength: {
          totalWords: config.volumes * config.chaptersPerVolume * config.wordsPerChapter,
          chapters: config.volumes * config.chaptersPerVolume,
        },
        uniqueSellingPoints: [],
        metadata: { generatedAt: new Date().toISOString(), novelAgentVersion: '1.0.0' },
      };

      const phase2Output = phase2WorldBuilding({
        requirements,
        projectName: input.projectName,
        config,
      });

      await runEffects(ctx, phase2Output.effects);
      phase2Success = true;
      break;
    } catch (error) {
      ctx.logger.error(`Phase2失败 (尝试 ${attempt}/${maxRetries})`, error as Error);
      if (attempt === maxRetries) {
        throw new AppError(
          'GENERATION_FAILED',
          'Phase2世界构建失败',
          { phase: 'phase2', attempts: maxRetries }
        );
      }
    }
  }

  if (!phase2Success) {
    throw new AppError('GENERATION_FAILED', 'Phase2世界构建失败');
  }

  // Phase 3: 大纲规划
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      ctx.logger.info(`Phase3: 大纲规划 (尝试 ${attempt}/${maxRetries})`);
      await runEffect(ctx, {
        type: 'SHOW_PROGRESS',
        payload: {
          current: 3,
          total: 3,
          message: 'Phase3: 规划大纲...',
        },
      });

      // 简化: 这里应该读取world-state.yaml,暂时使用占位符
      const worldState = {
        characters: {},
        locations: {},
        timeline: [],
        hooks: {},
        worldRules: [],
        lastUpdatedChapter: '',
      };

      const requirements = {
        novelType: '',
        targetAudience: { ageRange: '', readingPreferences: [] },
        coreConflict: { mainContradiction: '', opposingSides: [] },
        theme: '',
        emotionalTone: '',
        storyBackground: { era: '', region: '', socialEnvironment: '' },
        narrativePerspective: '',
        expectedLength: {
          totalWords: config.volumes * config.chaptersPerVolume * config.wordsPerChapter,
          chapters: config.volumes * config.chaptersPerVolume,
        },
        uniqueSellingPoints: [],
        metadata: { generatedAt: new Date().toISOString(), novelAgentVersion: '1.0.0' },
      };

      const phase3Output = phase3OutlinePlanning({
        requirements,
        worldState,
        projectName: input.projectName,
        config,
      });

      await runEffects(ctx, phase3Output.effects);
      phase3Success = true;
      break;
    } catch (error) {
      ctx.logger.error(`Phase3失败 (尝试 ${attempt}/${maxRetries})`, error as Error);
      if (attempt === maxRetries) {
        throw new AppError(
          'GENERATION_FAILED',
          'Phase3大纲规划失败',
          { phase: 'phase3', attempts: maxRetries }
        );
      }
    }
  }

  if (!phase3Success) {
    throw new AppError('GENERATION_FAILED', 'Phase3大纲规划失败');
  }

  // Requirement 3.14: 生成project.json元数据
  const project: Project = {
    projectName: input.projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
    config: {
      volumes: config.volumes,
      chaptersPerVolume: config.chaptersPerVolume,
      wordsPerChapter: config.wordsPerChapter,
    },
    progress: {
      currentPhase: 'phase3',
      completedChapters: 0,
      totalChapters: config.volumes * config.chaptersPerVolume,
    },
    chapters: [],
    statistics: {
      totalWords: 0,
      totalAICalls: 0,
      totalTokens: 0,
      totalFixRounds: 0,
    },
    status: 'draft',
  };

  await runEffect(ctx, {
    type: 'SAVE_FILE',
    payload: {
      path: path.join(projectPath, 'project.json'),
      content: JSON.stringify(project, null, 2),
    },
  });

  await runEffect(ctx, {
    type: 'SHOW_MESSAGE',
    payload: {
      type: 'success',
      message: '小说框架生成完成',
    },
  });

  return {
    projectPath,
    message: `项目已创建: ${projectPath}\n下一步: 运行 chapters 命令生成章节`,
  };
}

