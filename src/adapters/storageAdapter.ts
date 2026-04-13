/**
 * Storage Adapter实现
 * 实现文件系统存储,支持UTF-8编码、原子写入、路径安全检查
 */

import * as fs from 'fs-extra';
import * as path from 'node:path';
import { StoragePort } from '../core/ports.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { sanitizePath } from '../utils/pathSanitizer.js';

/**
 * 文件系统存储适配器
 */
export class FileSystemStorageAdapter implements StoragePort {
  /**
   * 保存文件(原子写入)
   */
  async saveFile(filePath: string, content: string): Promise<void> {
    try {
      // 路径安全检查
      const safePath = sanitizePath(filePath);

      // 确保目录存在
      const dir = path.dirname(safePath);
      await this.ensureDir(dir);

      // 原子写入: 先写入临时文件,再重命名
      const tempPath = `${safePath}.tmp`;
      await fs.writeFile(tempPath, content, { encoding: 'utf-8' });
      await fs.rename(tempPath, safePath);
    } catch (error) {
      this.handleFileError(error, filePath, 'save');
    }
  }

  /**
   * 读取文件
   */
  async readFile(filePath: string): Promise<string> {
    try {
      // 路径安全检查
      const safePath = sanitizePath(filePath);

      // 检查文件是否存在
      if (!(await this.fileExists(safePath))) {
        throw new AppError(
          ErrorCodes.FILE_NOT_FOUND,
          `文件不存在: ${filePath}`,
          { path: filePath }
        );
      }

      return await fs.readFile(safePath, { encoding: 'utf-8' });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.handleFileError(error, filePath, 'read');
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      // 路径安全检查
      const safePath = sanitizePath(filePath);
      return await fs.pathExists(safePath);
    } catch (error) {
      // 路径安全检查失败时返回false
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      // 路径安全检查
      const safePath = sanitizePath(dirPath);
      await fs.ensureDir(safePath);
    } catch (error) {
      this.handleFileError(error, dirPath, 'ensureDir');
    }
  }

  /**
   * 列出目录内容
   */
  async listDir(dirPath: string): Promise<string[]> {
    try {
      // 路径安全检查
      const safePath = sanitizePath(dirPath);

      // 检查目录是否存在
      if (!(await this.fileExists(safePath))) {
        throw new AppError(
          ErrorCodes.FILE_NOT_FOUND,
          `目录不存在: ${dirPath}`,
          { path: dirPath }
        );
      }

      return await fs.readdir(safePath);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      this.handleFileError(error, dirPath, 'listDir');
    }
  }

  /**
   * 统一的文件错误处理
   */
  private handleFileError(error: unknown, filePath: string, operation: string): never {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;

      // 权限错误
      if (nodeError.code === 'EACCES' || nodeError.code === 'EPERM') {
        throw new AppError(
          ErrorCodes.FILE_ACCESS_DENIED,
          `无权限${operation === 'read' ? '读取' : '写入'}文件: ${filePath}`,
          { path: filePath, operation, originalError: nodeError.message }
        );
      }

      // 磁盘空间不足
      if (nodeError.code === 'ENOSPC') {
        throw new AppError(
          ErrorCodes.FILE_WRITE_FAILED,
          '磁盘空间不足',
          { path: filePath, suggestion: '请清理磁盘空间后重试' }
        );
      }

      // 文件不存在
      if (nodeError.code === 'ENOENT') {
        throw new AppError(
          ErrorCodes.FILE_NOT_FOUND,
          `文件或目录不存在: ${filePath}`,
          { path: filePath }
        );
      }

      // 其他文件系统错误
      throw new AppError(
        ErrorCodes.FILE_WRITE_FAILED,
        `文件操作失败: ${nodeError.message}`,
        { path: filePath, operation, originalError: nodeError.message }
      );
    }

    // 未知错误
    throw new AppError(
      ErrorCodes.UNKNOWN,
      `文件操作失败: ${String(error)}`,
      { path: filePath, operation }
    );
  }
}
