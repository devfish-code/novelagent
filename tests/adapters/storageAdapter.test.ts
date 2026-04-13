/**
 * Storage Adapter集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemStorageAdapter } from '../../src/adapters/storageAdapter.js';
import { ErrorCodes } from '../../src/core/errors.js';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';

describe('FileSystemStorageAdapter', () => {
  let adapter: FileSystemStorageAdapter;
  let testDir: string;

  beforeEach(async () => {
    adapter = new FileSystemStorageAdapter();
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `novelagent-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir);
  });

  describe('saveFile', () => {
    it('应该成功保存文件', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, world!';

      await adapter.saveFile(filePath, content);

      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('应该使用UTF-8编码', async () => {
      const filePath = path.join(testDir, 'utf8.txt');
      const content = '你好，世界！🌍';

      await adapter.saveFile(filePath, content);

      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('应该自动创建不存在的目录', async () => {
      const filePath = path.join(testDir, 'subdir', 'nested', 'test.txt');
      const content = 'test';

      await adapter.saveFile(filePath, content);

      expect(await fs.pathExists(filePath)).toBe(true);
      const savedContent = await fs.readFile(filePath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('应该实现原子写入', async () => {
      const filePath = path.join(testDir, 'atomic.txt');
      
      // 先写入初始内容
      await adapter.saveFile(filePath, 'initial');
      
      // 再次写入,应该完全覆盖
      await adapter.saveFile(filePath, 'updated');
      
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('updated');
      
      // 确保没有临时文件残留
      const tempFile = `${filePath}.tmp`;
      expect(await fs.pathExists(tempFile)).toBe(false);
    });

    it('应该防止路径遍历攻击', async () => {
      // 使用相对路径形式的路径遍历
      const maliciousPath = '../../etc/passwd';

      await expect(
        adapter.saveFile(maliciousPath, 'malicious')
      ).rejects.toMatchObject({
        message: expect.stringContaining('path traversal'),
      });
    });
  });

  describe('readFile', () => {
    it('应该成功读取文件', async () => {
      const filePath = path.join(testDir, 'read.txt');
      const content = 'test content';
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await adapter.readFile(filePath);

      expect(result).toBe(content);
    });

    it('应该在文件不存在时抛出错误', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');

      await expect(
        adapter.readFile(filePath)
      ).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('应该防止路径遍历攻击', async () => {
      const maliciousPath = '../../../etc/passwd';

      await expect(
        adapter.readFile(maliciousPath)
      ).rejects.toMatchObject({
        message: expect.stringContaining('path traversal'),
      });
    });
  });

  describe('fileExists', () => {
    it('应该正确检测文件存在', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'test', 'utf-8');

      const exists = await adapter.fileExists(filePath);

      expect(exists).toBe(true);
    });

    it('应该正确检测文件不存在', async () => {
      const filePath = path.join(testDir, 'not-exists.txt');

      const exists = await adapter.fileExists(filePath);

      expect(exists).toBe(false);
    });

    it('应该正确检测目录存在', async () => {
      const dirPath = path.join(testDir, 'subdir');
      await fs.ensureDir(dirPath);

      const exists = await adapter.fileExists(dirPath);

      expect(exists).toBe(true);
    });

    it('应该对非法路径返回false', async () => {
      const maliciousPath = '../../../etc/passwd';

      const exists = await adapter.fileExists(maliciousPath);

      expect(exists).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('应该创建不存在的目录', async () => {
      const dirPath = path.join(testDir, 'newdir');

      await adapter.ensureDir(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('应该创建嵌套目录', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c');

      await adapter.ensureDir(dirPath);

      expect(await fs.pathExists(dirPath)).toBe(true);
    });

    it('应该在目录已存在时不报错', async () => {
      const dirPath = path.join(testDir, 'existing');
      await fs.ensureDir(dirPath);

      await expect(
        adapter.ensureDir(dirPath)
      ).resolves.not.toThrow();
    });
  });

  describe('listDir', () => {
    it('应该列出目录内容', async () => {
      const dirPath = path.join(testDir, 'listtest');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file1.txt'), 'test', 'utf-8');
      await fs.writeFile(path.join(dirPath, 'file2.txt'), 'test', 'utf-8');
      await fs.ensureDir(path.join(dirPath, 'subdir'));

      const files = await adapter.listDir(dirPath);

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('subdir');
    });

    it('应该在目录不存在时抛出错误', async () => {
      const dirPath = path.join(testDir, 'nonexistent');

      await expect(
        adapter.listDir(dirPath)
      ).rejects.toMatchObject({
        code: ErrorCodes.FILE_NOT_FOUND,
      });
    });

    it('应该返回空数组对于空目录', async () => {
      const dirPath = path.join(testDir, 'empty');
      await fs.ensureDir(dirPath);

      const files = await adapter.listDir(dirPath);

      expect(files).toEqual([]);
    });
  });
});
