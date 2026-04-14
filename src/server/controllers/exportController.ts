/**
 * Export Controller
 * 处理导出相关的业务逻辑
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as fs from 'fs-extra';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';
import { dispatch } from '../../bus/dispatcher.js';
import type { AppContext } from '../../bus/effectRunner.js';
import type { ExportRequest, ExportResponse } from '../types/api.js';

/**
 * POST /api/projects/:name/export
 * 导出项目文件
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function exportProject(
  req: Request<{ name: string }, object, ExportRequest>,
  res: Response<ExportResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName } = req.params;
    const { format, files } = req.body;

    // 获取依赖
    const ctx = req.app.locals.appContext as AppContext;

    // 验证依赖是否存在
    if (!ctx) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'AppContext 未初始化'
      );
    }

    // 验证项目是否存在
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, projectName);
    const configPath = path.join(projectDir, 'config.yaml');

    if (!(await fs.pathExists(configPath))) {
      throw new AppError(
        ErrorCodes.PROJECT_NOT_FOUND,
        `项目 "${projectName}" 不存在`,
        { name: projectName }
      );
    }

    ctx.logger.info('开始导出项目', {
      projectName,
      format,
      files,
    });

    // 调用 Bus 层的 ExportProjectCommand
    const result = await dispatch(ctx, {
      type: 'EXPORT_PROJECT',
      payload: {
        projectName,
        dir: workingDir,
        format,
      },
    });

    if (!result.success) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        result.error?.message || '导出失败',
        result.error?.details
      );
    }

    // 读取导出目录获取文件列表
    const exportDir = path.join(projectDir, 'exports');
    const exportData = result.data as { exportPath: string; files: string[]; message: string } | undefined;
    const exportedFiles = exportData?.files || [];

    // 为每个文件生成下载 URL 和获取文件大小
    const fileInfos = await Promise.all(
      exportedFiles
        .filter((filename: string) => {
          // 根据请求的 files 参数过滤文件
          if (files.includes('novel') && filename === 'novel.md') return true;
          if (files.includes('world') && filename === 'world.md') return true;
          if (files.includes('characters') && filename === 'characters.md') return true;
          if (files.includes('outline') && filename === 'outline.md') return true;
          if (files.includes('timeline') && filename === 'timeline.md') return true;
          if (files.includes('report') && filename === 'report.md') return true;
          if (format === 'json' && filename === 'project-export.json') return true;
          return false;
        })
        .map(async (filename: string) => {
          const filePath = path.join(exportDir, filename);
          const stats = await fs.stat(filePath);
          return {
            name: filename,
            url: `/api/projects/${projectName}/exports/${filename}`,
            size: stats.size,
          };
        })
    );

    ctx.logger.info('导出完成', {
      projectName,
      fileCount: fileInfos.length,
    });

    res.json({
      success: true,
      files: fileInfos,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:name/exports/:filename
 * 下载导出的文件
 * 
 * Requirements: 5.3, 5.4
 */
export async function downloadExport(
  req: Request<{ name: string; filename: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name: projectName, filename } = req.params;

    // 获取依赖
    const ctx = req.app.locals.appContext as AppContext;

    // 验证依赖是否存在
    if (!ctx) {
      throw new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'AppContext 未初始化'
      );
    }

    // 验证项目是否存在
    const workingDir = process.cwd();
    const projectDir = path.join(workingDir, projectName);
    const configPath = path.join(projectDir, 'config.yaml');

    if (!(await fs.pathExists(configPath))) {
      throw new AppError(
        ErrorCodes.PROJECT_NOT_FOUND,
        `项目 "${projectName}" 不存在`,
        { name: projectName }
      );
    }

    // 验证文件名安全性（防止路径遍历攻击）
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '文件名无效',
        { filename }
      );
    }

    // 构建文件路径
    const exportDir = path.join(projectDir, 'exports');
    const filePath = path.join(exportDir, safeFilename);

    // 验证文件路径是否在导出目录内（防止路径遍历）
    const normalizedFilePath = path.normalize(filePath);
    const normalizedExportDir = path.normalize(exportDir);
    if (!normalizedFilePath.startsWith(normalizedExportDir)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '文件路径无效',
        { filename }
      );
    }

    // 验证文件是否存在
    if (!(await fs.pathExists(filePath))) {
      throw new AppError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        `文件 "${filename}" 不存在`,
        { filename }
      );
    }

    ctx.logger.info('下载导出文件', {
      projectName,
      filename,
    });

    // 设置 Content-Type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.md') {
      contentType = 'text/markdown; charset=utf-8';
    } else if (ext === '.json') {
      contentType = 'application/json; charset=utf-8';
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 发送文件
    res.download(filePath, filename, (err) => {
      if (err) {
        ctx.logger.error('文件下载失败', err);
        if (!res.headersSent) {
          next(err);
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
