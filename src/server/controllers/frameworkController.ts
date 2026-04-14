/**
 * Framework Controller
 * 处理框架生成相关的业务逻辑
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as fs from 'fs-extra';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';
import { dispatch } from '../../bus/dispatcher.js';
import type { AppContext } from '../../bus/effectRunner.js';
import { TaskManager } from '../services/taskManager.js';
import { ProgressTracker } from '../services/progressTracker.js';

/**
 * Request/Response types
 */
interface GenerateFrameworkRequest {
  creativeDescription: string;
  volumes?: number;
  chaptersPerVolume?: number;
  wordsPerChapter?: number;
}

interface GenerateFrameworkResponse {
  success: boolean;
  taskId: string;
  message: string;
}

/**
 * POST /api/projects/:name/framework
 * 生成小说框架（Phase 1-3）
 */
export async function generateFramework(
  req: Request<{ name: string }, object, GenerateFrameworkRequest>,
  res: Response<GenerateFrameworkResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName } = req.params;
    const {
      creativeDescription,
      volumes = 3,
      chaptersPerVolume = 10,
      wordsPerChapter = 3000,
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

    // 验证项目名称
    if (!isValidProjectName(projectName)) {
      throw new AppError(
        ErrorCodes.PROJECT_INVALID_NAME,
        '项目名称无效，只能包含字母、数字、下划线和连字符',
        { name: projectName }
      );
    }

    // 检查项目是否已存在
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, projectName);
    const configPath = path.join(projectDir, 'config.yaml');

    if (await fs.pathExists(configPath)) {
      throw new AppError(
        ErrorCodes.PROJECT_ALREADY_EXISTS,
        `项目 "${projectName}" 已存在`,
        { name: projectName, suggestion: '请使用不同的项目名称或先删除现有项目' }
      );
    }

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
    const task = taskManager.createTask(projectName, 'framework');
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
      message: '框架生成任务已启动',
    });

    // 在后台异步执行框架生成
    executeFrameworkGeneration(
      ctx,
      taskManager,
      progressTracker,
      taskId,
      projectName,
      projectDir,
      creativeDescription,
      volumes,
      chaptersPerVolume,
      wordsPerChapter,
      abortController
    ).catch((error) => {
      ctx.logger.error('框架生成后台任务失败', error);
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 后台执行框架生成任务
 */
async function executeFrameworkGeneration(
  ctx: AppContext,
  taskManager: TaskManager,
  progressTracker: ProgressTracker,
  taskId: string,
  projectName: string,
  _projectDir: string,
  creativeDescription: string,
  volumes: number,
  chaptersPerVolume: number,
  wordsPerChapter: number,
  abortController: AbortController
): Promise<void> {
  try {
    ctx.logger.info(`开始执行框架生成任务: ${taskId}`, {
      projectName,
      volumes,
      chaptersPerVolume,
      wordsPerChapter,
    });

    // Phase 1 开始
    progressTracker.updateProgress(
      taskId,
      { phase: 1, percentage: 0, current: 0, total: 3 },
      'Phase 1: 开始分析需求...'
    );

    // 检查是否被取消
    if (abortController.signal.aborted) {
      throw new Error('任务已被取消');
    }

    // 调用 Bus 层的 GenerateFrameworkCommand
    const result = await dispatch(ctx, {
      type: 'GENERATE_FRAMEWORK',
      payload: {
        creativeDescription,
        projectName,
        dir: process.cwd(),
        volumes,
        chaptersPerVolume,
        wordsPerChapter,
      },
    });

    // 检查是否被取消
    if (abortController.signal.aborted) {
      throw new Error('任务已被取消');
    }

    if (!result.success) {
      throw new Error(result.error?.message || '框架生成失败');
    }

    // Phase 1 完成
    progressTracker.updateProgress(
      taskId,
      { phase: 1, percentage: 33, current: 1, total: 3 },
      'Phase 1: 需求分析完成'
    );

    // Phase 2 开始
    progressTracker.updateProgress(
      taskId,
      { phase: 2, percentage: 33, current: 1, total: 3 },
      'Phase 2: 开始构建世界观...'
    );

    // Phase 2 完成
    progressTracker.updateProgress(
      taskId,
      { phase: 2, percentage: 66, current: 2, total: 3 },
      'Phase 2: 世界观构建完成'
    );

    // Phase 3 开始
    progressTracker.updateProgress(
      taskId,
      { phase: 3, percentage: 66, current: 2, total: 3 },
      'Phase 3: 开始规划大纲...'
    );

    // Phase 3 完成
    progressTracker.updateProgress(
      taskId,
      { phase: 3, percentage: 100, current: 3, total: 3 },
      'Phase 3: 大纲规划完成'
    );

    // 任务完成
    taskManager.completeTask(taskId);
    progressTracker.broadcastComplete(taskId, 3, {
      success: true,
      summary: '小说框架生成完成',
      data: result.data,
    });

    ctx.logger.info(`框架生成任务完成: ${taskId}`);
  } catch (error) {
    ctx.logger.error(`框架生成任务失败: ${taskId}`, error as Error);

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

/**
 * 验证项目名称
 */
function isValidProjectName(name: string): boolean {
  // 只允许字母、数字、下划线和连字符
  return /^[a-zA-Z0-9_-]+$/.test(name);
}
