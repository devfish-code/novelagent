/**
 * 路径安全检查工具
 * 防止路径遍历攻击和其他路径安全问题
 */

import * as path from 'node:path';

/**
 * 清理和验证路径,防止路径遍历攻击
 * @param inputPath 用户输入的路径
 * @param baseDir 基础目录(可选),如果提供则验证路径必须在此目录下
 * @returns 清理后的安全路径
 * @throws 如果路径不安全,抛出错误
 */
export function sanitizePath(inputPath: string, baseDir?: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path: path must be a non-empty string');
  }

  // 检查是否包含路径遍历模式(在规范化之前检查)
  if (containsPathTraversal(inputPath)) {
    throw new Error(`Invalid path: path traversal detected in "${inputPath}"`);
  }

  // 规范化路径,解析 . 和 .. 等相对路径符号
  const normalizedPath = path.normalize(inputPath);

  // 检查是否包含非法字符
  if (containsIllegalCharacters(normalizedPath)) {
    throw new Error(`Invalid path: illegal characters detected in "${inputPath}"`);
  }

  // 如果提供了基础目录,验证路径必须在基础目录下
  if (baseDir) {
    const resolvedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(baseDir, normalizedPath);

    // 检查解析后的路径是否在基础目录下
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      throw new Error(
        `Invalid path: "${inputPath}" is outside the base directory "${baseDir}"`
      );
    }

    return resolvedPath;
  }

  return normalizedPath;
}

/**
 * 检查路径是否包含路径遍历模式
 * @param inputPath 原始输入路径
 * @returns 是否包含路径遍历模式
 */
function containsPathTraversal(inputPath: string): boolean {
  // 检查是否包含 .. 路径遍历
  // 使用正则表达式检测各种形式的 ..
  const traversalPattern = /(^|\/|\\)\.\.($|\/|\\)/;
  return traversalPattern.test(inputPath);
}

/**
 * 检查路径是否包含非法字符
 * @param normalizedPath 规范化后的路径
 * @returns 是否包含非法字符
 */
function containsIllegalCharacters(normalizedPath: string): boolean {
  // 检查空字节注入
  if (normalizedPath.includes('\0')) {
    return true;
  }

  // Windows特定的非法字符检查
  if (process.platform === 'win32') {
    const illegalChars = /[<>:"|?*]/;
    // 排除驱动器盘符后的冒号 (如 C:)
    const pathWithoutDrive = normalizedPath.replace(/^[a-zA-Z]:/, '');
    if (illegalChars.test(pathWithoutDrive)) {
      return true;
    }
  }

  return false;
}
