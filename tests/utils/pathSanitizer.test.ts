/**
 * 路径安全检查工具测试
 */

import { describe, it, expect } from 'vitest';
import { sanitizePath } from '../../src/utils/pathSanitizer';
import * as path from 'node:path';

describe('sanitizePath', () => {
  describe('基本功能', () => {
    it('应该返回规范化的路径', () => {
      const result = sanitizePath('foo/bar');
      expect(result).toBe(path.normalize('foo/bar'));
    });

    it('应该处理绝对路径', () => {
      const absolutePath = path.resolve('/tmp/test');
      const result = sanitizePath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('应该规范化路径中的 . 符号', () => {
      const result = sanitizePath('foo/./bar');
      expect(result).toBe(path.normalize('foo/bar'));
    });
  });

  describe('路径遍历攻击防护', () => {
    it('应该拒绝包含 .. 的路径', () => {
      expect(() => sanitizePath('../etc/passwd')).toThrow('path traversal detected');
    });

    it('应该拒绝包含多个 .. 的路径', () => {
      expect(() => sanitizePath('../../etc/passwd')).toThrow('path traversal detected');
    });

    it('应该拒绝中间包含 .. 的路径', () => {
      expect(() => sanitizePath('foo/../bar')).toThrow('path traversal detected');
    });

    it('应该拒绝复杂的路径遍历尝试', () => {
      expect(() => sanitizePath('foo/bar/../../etc/passwd')).toThrow('path traversal detected');
    });
  });

  describe('非法字符检测', () => {
    it('应该拒绝包含空字节的路径', () => {
      expect(() => sanitizePath('foo\0bar')).toThrow('illegal characters detected');
    });

    it('应该在Windows上拒绝非法字符 <', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('foo<bar')).toThrow('illegal characters detected');
      }
    });

    it('应该在Windows上拒绝非法字符 >', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('foo>bar')).toThrow('illegal characters detected');
      }
    });

    it('应该在Windows上拒绝非法字符 |', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('foo|bar')).toThrow('illegal characters detected');
      }
    });

    it('应该在Windows上拒绝非法字符 ?', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('foo?bar')).toThrow('illegal characters detected');
      }
    });

    it('应该在Windows上拒绝非法字符 *', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('foo*bar')).toThrow('illegal characters detected');
      }
    });

    it('应该在Windows上允许驱动器盘符中的冒号', () => {
      if (process.platform === 'win32') {
        expect(() => sanitizePath('C:\\Users\\test')).not.toThrow();
      }
    });
  });

  describe('输入验证', () => {
    it('应该拒绝空字符串', () => {
      expect(() => sanitizePath('')).toThrow('path must be a non-empty string');
    });

    it('应该拒绝非字符串输入', () => {
      expect(() => sanitizePath(null as any)).toThrow('path must be a non-empty string');
      expect(() => sanitizePath(undefined as any)).toThrow('path must be a non-empty string');
      expect(() => sanitizePath(123 as any)).toThrow('path must be a non-empty string');
    });
  });

  describe('基础目录限制', () => {
    it('应该允许在基础目录下的路径', () => {
      const baseDir = '/tmp/project';
      const result = sanitizePath('foo/bar', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'foo/bar'));
    });

    it('应该拒绝超出基础目录的路径', () => {
      const baseDir = '/tmp/project';
      // 包含 .. 的路径会被路径遍历检查拒绝
      expect(() => sanitizePath('../outside', baseDir)).toThrow('path traversal detected');
    });

    it('应该允许基础目录本身', () => {
      const baseDir = '/tmp/project';
      const result = sanitizePath('.', baseDir);
      expect(result).toBe(path.resolve(baseDir));
    });

    it('应该拒绝绝对路径超出基础目录', () => {
      const baseDir = '/tmp/project';
      expect(() => sanitizePath('/etc/passwd', baseDir)).toThrow('outside the base directory');
    });

    it('应该处理基础目录的子目录', () => {
      const baseDir = '/tmp/project';
      const result = sanitizePath('subdir/file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'subdir/file.txt'));
      expect(result.startsWith(path.resolve(baseDir))).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理单个文件名', () => {
      const result = sanitizePath('file.txt');
      expect(result).toBe('file.txt');
    });

    it('应该处理带有多个斜杠的路径', () => {
      const result = sanitizePath('foo//bar///baz');
      expect(result).toBe(path.normalize('foo/bar/baz'));
    });

    it('应该处理以斜杠结尾的路径', () => {
      const result = sanitizePath('foo/bar/');
      expect(result).toBe(path.normalize('foo/bar/'));
    });
  });
});
