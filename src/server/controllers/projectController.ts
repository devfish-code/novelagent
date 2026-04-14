/**
 * Project Controller
 * 处理项目管理相关的业务逻辑
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as fs from 'fs-extra';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';
import { dispatch } from '../../bus/dispatcher.js';
import type { AppContext } from '../../bus/effectRunner.js';
import type {
  InitProjectRequest,
  InitProjectResponse,
  ListProjectsResponse,
  GetProjectResponse,
  DeleteProjectResponse,
  TestConnectionRequest,
  TestConnectionResponse,
  ProjectSummary,
  ProjectDetail,
} from '../types/api.js';

/**
 * POST /api/projects/init
 * 初始化新项目
 */
export async function initProject(
  req: Request<object, object, InitProjectRequest>,
  res: Response<InitProjectResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name, force = false } = req.body;
    const ctx = req.app.locals.appContext as AppContext;

    // 验证项目名称
    if (!isValidProjectName(name)) {
      throw new AppError(
        ErrorCodes.PROJECT_INVALID_NAME,
        '项目名称无效，只能包含字母、数字、下划线和连字符',
        { name }
      );
    }

    // 构建项目目录路径
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, name);

    // 检查项目是否已存在
    const configPath = path.join(projectDir, 'config.yaml');
    const exists = await fs.pathExists(configPath);
    
    if (exists && !force) {
      throw new AppError(
        ErrorCodes.PROJECT_ALREADY_EXISTS,
        `项目 "${name}" 已存在`,
        { name, suggestion: '使用 force: true 覆盖已存在的项目' }
      );
    }

    // 调用 Bus 层的 InitProjectCommand
    const result = await dispatch(ctx, {
      type: 'INIT_PROJECT',
      payload: {
        dir: projectDir,
        force,
      },
    });

    if (!result.success) {
      // Convert core error codes to server error codes
      let errorCode = result.error?.code || ErrorCodes.INTERNAL_SERVER_ERROR;
      
      // Map core error codes to server error codes
      if (errorCode === 'CONFIG_EXISTS') {
        errorCode = ErrorCodes.PROJECT_ALREADY_EXISTS;
      }
      
      throw new AppError(
        errorCode,
        result.error?.message || '项目初始化失败',
        result.error?.details
      );
    }

    // 返回成功响应
    res.status(201).json({
      success: true,
      project: {
        name,
        dir: projectDir,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects
 * 列出所有项目
 */
export async function listProjects(
  req: Request,
  res: Response<ListProjectsResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const ctx = req.app.locals.appContext as AppContext;
    const workingDir = process.cwd();

    // 扫描工作目录，查找所有包含 config.yaml 的项目
    const entries = await fs.readdir(workingDir, { withFileTypes: true });
    const projects: ProjectSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectDir = path.join(workingDir, entry.name);
      const configPath = path.join(projectDir, 'config.yaml');

      // 检查是否存在 config.yaml
      if (await fs.pathExists(configPath)) {
        try {
          const summary = await getProjectSummary(ctx, entry.name, projectDir);
          projects.push(summary);
        } catch (error) {
          // 跳过无法读取的项目
          ctx.logger.error(`无法读取项目: ${entry.name}`, error as Error);
        }
      }
    }

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:name
 * 获取单个项目详情
 */
export async function getProject(
  req: Request<{ name: string }>,
  res: Response<GetProjectResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.params;
    const ctx = req.app.locals.appContext as AppContext;
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, name);

    // 检查项目是否存在
    const configPath = path.join(projectDir, 'config.yaml');
    if (!(await fs.pathExists(configPath))) {
      throw new AppError(
        ErrorCodes.PROJECT_NOT_FOUND,
        `项目 "${name}" 不存在`,
        { name }
      );
    }

    // 获取项目详情
    const project = await getProjectDetail(ctx, name, projectDir);

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:name
 * 删除项目
 */
export async function deleteProject(
  req: Request<{ name: string }>,
  res: Response<DeleteProjectResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.params;
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, name);

    // 检查项目是否存在
    const configPath = path.join(projectDir, 'config.yaml');
    if (!(await fs.pathExists(configPath))) {
      throw new AppError(
        ErrorCodes.PROJECT_NOT_FOUND,
        `项目 "${name}" 不存在`,
        { name }
      );
    }

    // 删除项目目录
    await fs.remove(projectDir);

    res.json({
      success: true,
      message: `项目 "${name}" 已删除`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/test-connection
 * 测试 AI 连接
 */
export async function testConnection(
  req: Request<object, object, TestConnectionRequest>,
  res: Response<TestConnectionResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { model } = req.body;
    const ctx = req.app.locals.appContext as AppContext;

    // 调用 Bus 层的 TestAIConnectionCommand
    const result = await dispatch(ctx, {
      type: 'TEST_AI_CONNECTION',
      payload: { model },
    });

    if (!result.success) {
      throw new AppError(
        result.error?.code || ErrorCodes.AI_CONNECTION_FAILED,
        result.error?.message || 'AI 连接测试失败',
        result.error?.details
      );
    }

    const data = result.data as { results: TestConnectionResponse['results'] };

    res.json({
      success: true,
      results: data.results,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 验证项目名称
 */
function isValidProjectName(name: string): boolean {
  // 只允许字母、数字、下划线和连字符
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * 获取项目摘要信息
 */
async function getProjectSummary(
  _ctx: AppContext,
  name: string,
  projectDir: string
): Promise<ProjectSummary> {
  // 读取项目元数据文件
  const metadataPath = path.join(projectDir, 'project.json');
  let metadata: any = null;

  if (await fs.pathExists(metadataPath)) {
    const content = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(content);
  }

  // 读取配置文件获取基本信息
  const configPath = path.join(projectDir, 'config.yaml');
  const configContent = await fs.readFile(configPath, 'utf-8');
  
  // 简单解析 YAML 配置（提取 volumes 和 chaptersPerVolume）
  const volumesMatch = configContent.match(/volumes:\s*(\d+)/);
  const chaptersMatch = configContent.match(/chaptersPerVolume:\s*(\d+)/);
  
  const volumes = volumesMatch ? parseInt(volumesMatch[1]) : 3;
  const chaptersPerVolume = chaptersMatch ? parseInt(chaptersMatch[1]) : 10;
  const totalChapters = volumes * chaptersPerVolume;

  // 统计已完成的章节
  let completedChapters = 0;
  const chaptersDir = path.join(projectDir, 'chapters');
  if (await fs.pathExists(chaptersDir)) {
    const files = await fs.readdir(chaptersDir);
    completedChapters = files.filter(f => f.endsWith('.md')).length;
  }

  // 获取文件时间戳
  const stats = await fs.stat(configPath);
  const createdAt = stats.birthtime.toISOString();
  const updatedAt = stats.mtime.toISOString();

  // 确定状态和进度
  const status = metadata?.status || (completedChapters === 0 ? 'idle' : 
                  completedChapters === totalChapters ? 'completed' : 'generating');
  
  const phase = metadata?.progress?.currentPhase || 1;
  const percentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
  const currentTask = metadata?.progress?.currentTask || '等待开始';

  return {
    name,
    status,
    progress: {
      phase,
      percentage,
      currentTask,
    },
    metadata: {
      createdAt,
      updatedAt,
      volumes,
      chaptersPerVolume,
      totalChapters,
      completedChapters,
    },
  };
}

/**
 * 获取项目详细信息
 */
async function getProjectDetail(
  _ctx: AppContext,
  name: string,
  projectDir: string
): Promise<ProjectDetail> {
  // 获取基本摘要信息
  const summary = await getProjectSummary(_ctx, name, projectDir);

  // 读取需求文档
  let requirements: string | undefined;
  const requirementsPath = path.join(projectDir, 'requirements.md');
  if (await fs.pathExists(requirementsPath)) {
    requirements = await fs.readFile(requirementsPath, 'utf-8');
  }

  // 读取章节列表
  const chapters = await getChaptersList(projectDir, summary.metadata.volumes, summary.metadata.chaptersPerVolume);

  return {
    ...summary,
    requirements,
    chapters,
  };
}

/**
 * 获取章节列表
 */
async function getChaptersList(
  projectDir: string,
  volumes: number,
  chaptersPerVolume: number
): Promise<ProjectDetail['chapters']> {
  const chapters: ProjectDetail['chapters'] = [];
  const chaptersDir = path.join(projectDir, 'chapters');

  for (let v = 1; v <= volumes; v++) {
    for (let c = 1; c <= chaptersPerVolume; c++) {
      const chapterFile = path.join(chaptersDir, `volume${v}_chapter${c}.md`);
      const exists = await fs.pathExists(chapterFile);

      let title = `第${v}卷 第${c}章`;
      let status: 'pending' | 'generating' | 'completed' | 'failed' = 'pending';
      let wordCount: number | undefined;

      if (exists) {
        status = 'completed';
        const content = await fs.readFile(chapterFile, 'utf-8');
        
        // 提取标题（第一行 # 标题）
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1];
        }

        // 统计字数（去除 Markdown 标记）
        const plainText = content.replace(/[#*`\[\]()]/g, '').trim();
        wordCount = plainText.length;
      }

      chapters.push({
        volume: v,
        chapter: c,
        title,
        status,
        wordCount,
      });
    }
  }

  return chapters;
}
