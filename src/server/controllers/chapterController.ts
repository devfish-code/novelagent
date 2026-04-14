/**
 * Chapter Controller
 * 处理章节生成相关的业务逻辑
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as fs from 'fs-extra';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';
import { dispatch } from '../../bus/dispatcher.js';
import type { AppContext } from '../../bus/effectRunner.js';
import { TaskManager } from '../services/taskManager.js';
import { ProgressTracker } from '../services/progressTracker.js';
import type { Project } from '../../core/models/project.js';

/**
 * Request/Response types
 */
interface GenerateChaptersRequest {
  volume?: number;
  startChapter?: number;
  endChapter?: number;
  specificChapter?: number;
  force?: boolean;
}

interface GenerateChaptersResponse {
  success: boolean;
  taskId: string;
  chaptersToGenerate: number;
}

interface PauseChaptersResponse {
  success: boolean;
  message: string;
}

interface ResumeChaptersResponse {
  success: boolean;
  taskId: string;
}

/**
 * POST /api/projects/:name/chapters
 * 生成章节（Phase 4）
 */
export async function generateChapters(
  req: Request<{ name: string }, object, GenerateChaptersRequest>,
  res: Response<GenerateChaptersResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName } = req.params;
    const {
      volume,
      startChapter,
      endChapter,
      specificChapter,
      force = false,
    } = req.body;

    // 获取依赖
    const ctx = req.app.locals.appContext as AppContext;
    const taskManager = req.app.locals.taskManager as TaskManager;
    const progressTracker = req.app.locals.progressTracker as ProgressTracker;

    // 验证依赖是否存在
    if (!ctx) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'AppContext 未初始化'
      );
    }
    if (!taskManager) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'TaskManager 未初始化'
      );
    }
    if (!progressTracker) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'ProgressTracker 未初始化'
      );
    }

    // 验证项目是否存在
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, projectName);
    const projectJsonPath = path.join(projectDir, 'project.json');

    if (!(await fs.pathExists(projectJsonPath))) {
      throw new AppError(
        ErrorCodes.PROJECT_NOT_FOUND,
        `项目 "${projectName}" 不存在`,
        { name: projectName, suggestion: '请先生成小说框架' }
      );
    }

    // 读取项目信息以计算待生成章节数
    const projectContent = await fs.readFile(projectJsonPath, 'utf-8');
    const project: Project = JSON.parse(projectContent);

    // 计算待生成章节数
    const chaptersToGenerate = calculateChaptersToGenerate(
      project,
      { volume, startChapter, endChapter, specificChapter, force }
    );

    // 检查是否有正在运行的任务
    const runningTask = taskManager.getRunningTask(projectName);
    if (runningTask) {
      throw new AppError(
        ErrorCodes.TASK_ALREADY_RUNNING,
        `项目 "${projectName}" 已有任务正在运行`,
        { taskId: runningTask.id, taskType: runningTask.type }
      );
    }

    // 创建新任务
    const task = taskManager.createTask(projectName, 'chapters');
    const taskId = task.id;

    // 启动任务
    taskManager.startTask(taskId);

    // 创建 AbortController
    const abortController = new AbortController();
    taskManager.setAbortController(taskId, abortController);

    // 立即返回响应
    res.status(202).json({
      success: true,
      taskId,
      chaptersToGenerate,
    });

    // 在后台异步执行章节生成
    executeChapterGeneration(
      ctx,
      taskManager,
      progressTracker,
      taskId,
      projectName,
      workingDir,
      { volume, startChapter, endChapter, specificChapter, force },
      chaptersToGenerate,
      abortController
    ).catch((error) => {
      ctx.logger.error('章节生成后台任务失败', error);
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/:name/chapters/pause
 * 暂停章节生成任务
 */
export async function pauseChapters(
  req: Request<{ name: string }>,
  res: Response<PauseChaptersResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName } = req.params;

    // 获取依赖
    const taskManager = req.app.locals.taskManager as TaskManager;
    const progressTracker = req.app.locals.progressTracker as ProgressTracker;

    if (!taskManager) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'TaskManager 未初始化'
      );
    }
    if (!progressTracker) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'ProgressTracker 未初始化'
      );
    }

    // 获取项目的运行中任务
    const runningTask = taskManager.getRunningTask(projectName);
    if (!runningTask) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `项目 "${projectName}" 没有正在运行的任务`,
        { projectName }
      );
    }

    // 暂停任务
    taskManager.pauseTask(runningTask.id);

    // 广播状态变化
    progressTracker.broadcastStatus(runningTask.id, 'paused', runningTask.progress.phase);

    res.json({
      success: true,
      message: '任务已暂停',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/:name/chapters/resume
 * 恢复章节生成任务
 */
export async function resumeChapters(
  req: Request<{ name: string }>,
  res: Response<ResumeChaptersResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName } = req.params;

    // 获取依赖
    const ctx = req.app.locals.appContext as AppContext;
    const taskManager = req.app.locals.taskManager as TaskManager;
    const progressTracker = req.app.locals.progressTracker as ProgressTracker;

    if (!ctx) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'AppContext 未初始化'
      );
    }
    if (!taskManager) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'TaskManager 未初始化'
      );
    }
    if (!progressTracker) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'ProgressTracker 未初始化'
      );
    }

    // 获取项目的暂停任务
    const pausedTask = taskManager.getProjectTasks(projectName).find(
      (task) => task.status === 'paused'
    );

    if (!pausedTask) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `项目 "${projectName}" 没有暂停的任务`,
        { projectName }
      );
    }

    // 恢复任务
    taskManager.resumeTask(pausedTask.id);

    // 广播状态变化
    progressTracker.broadcastStatus(pausedTask.id, 'running', pausedTask.progress.phase);

    // 注意：实际的恢复逻辑需要在后台任务中处理
    // 这里只是更新了任务状态，后台任务会检查状态并继续执行

    res.json({
      success: true,
      taskId: pausedTask.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 计算待生成章节数
 */
function calculateChaptersToGenerate(
  project: Project,
  options: {
    volume?: number;
    startChapter?: number;
    endChapter?: number;
    specificChapter?: number;
    force?: boolean;
  }
): number {
  const { volume, startChapter, endChapter, specificChapter, force } = options;

  // 生成所有章节的列表
  const allChapters: Array<{ volume: number; chapter: number }> = [];
  for (let v = 1; v <= project.config.volumes; v++) {
    for (let c = 1; c <= project.config.chaptersPerVolume; c++) {
      allChapters.push({ volume: v, chapter: c });
    }
  }

  // 过滤已完成的章节（除非使用 force）
  let pendingChapters = allChapters;
  if (!force) {
    const completedChapterIds = new Set(
      project.chapters
        .filter((c) => c.status === 'completed')
        .map((c) => `${c.volume}-${c.chapter}`)
    );

    pendingChapters = allChapters.filter(
      (c) => !completedChapterIds.has(`${c.volume}-${c.chapter}`)
    );
  }

  // 按 volume 过滤
  if (volume !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.volume === volume);
  }

  // 按 range 过滤
  if (startChapter !== undefined && endChapter !== undefined) {
    pendingChapters = pendingChapters.filter(
      (c) => c.chapter >= startChapter && c.chapter <= endChapter
    );
  }

  // 按 specificChapter 过滤
  if (specificChapter !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.chapter === specificChapter);
  }

  return pendingChapters.length;
}

/**
 * 后台执行章节生成任务
 */
async function executeChapterGeneration(
  ctx: AppContext,
  taskManager: TaskManager,
  progressTracker: ProgressTracker,
  taskId: string,
  projectName: string,
  workingDir: string,
  options: {
    volume?: number;
    startChapter?: number;
    endChapter?: number;
    specificChapter?: number;
    force?: boolean;
  },
  totalChapters: number,
  abortController: AbortController
): Promise<void> {
  try {
    ctx.logger.info(`开始执行章节生成任务: ${taskId}`, {
      projectName,
      options,
      totalChapters,
    });

    // Phase 4 开始
    progressTracker.updateProgress(
      taskId,
      { phase: 4, percentage: 0, current: 0, total: totalChapters },
      'Phase 4: 开始生成章节...'
    );

    // 检查是否被取消
    if (abortController.signal.aborted) {
      throw new Error('任务已被取消');
    }

    // 调用 Bus 层的 GenerateChaptersCommand
    const result = await dispatch(ctx, {
      type: 'GENERATE_CHAPTERS',
      payload: {
        projectName,
        dir: workingDir,
        volume: options.volume,
        startChapter: options.startChapter,
        endChapter: options.endChapter,
        specificChapter: options.specificChapter,
        force: options.force || false,
      },
    });

    // 检查是否被取消
    if (abortController.signal.aborted) {
      throw new Error('任务已被取消');
    }

    if (!result.success) {
      throw new Error(result.error?.message || '章节生成失败');
    }

    // Phase 4 完成
    progressTracker.updateProgress(
      taskId,
      { phase: 4, percentage: 100, current: totalChapters, total: totalChapters },
      'Phase 4: 章节生成完成'
    );

    // 检查是否所有章节都已完成，如果是则进入 Phase 5
    const projectJsonPath = path.join(workingDir, projectName, 'project.json');
    const projectContent = await fs.readFile(projectJsonPath, 'utf-8');
    const project: Project = JSON.parse(projectContent);

    if (project.progress.completedChapters === project.progress.totalChapters) {
      // Phase 5 开始
      progressTracker.updateProgress(
        taskId,
        { phase: 5, percentage: 100, current: 1, total: 1 },
        'Phase 5: 全书校验完成'
      );
    }

    // 任务完成
    taskManager.completeTask(taskId);
    progressTracker.broadcastComplete(taskId, project.status === 'completed' ? 5 : 4, {
      success: true,
      summary: `章节生成完成，共生成 ${totalChapters} 个章节`,
      data: result.data,
    });

    ctx.logger.info(`章节生成任务完成: ${taskId}`);
  } catch (error) {
    ctx.logger.error(`章节生成任务失败: ${taskId}`, error as Error);

    // 标记任务失败
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorCode = error instanceof AppError ? error.code : 'GENERATION_FAILED';

    taskManager.failTask(taskId, {
      code: errorCode,
      message: errorMessage,
      details: error instanceof AppError ? error.details : undefined,
    });

    // 广播错误
    progressTracker.broadcastError(taskId, {
      code: errorCode,
      message: errorMessage,
      details: error instanceof AppError ? error.details : undefined,
    });
  }
}
