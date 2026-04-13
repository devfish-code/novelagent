/**
 * AppContext构建器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { buildAppContext } from '../../src/shells/contextBuilder';

describe('buildAppContext', () => {
  const testDir = path.join(process.cwd(), 'test-temp-context-builder');
  const configPath = path.join(testDir, 'config.yaml');

  beforeEach(async () => {
    // 创建测试目录
    await fs.ensureDir(testDir);

    // 创建测试配置文件
    const testConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key-main
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key-json
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000

generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3

logging:
  logLevel: info
  logDir: ${testDir}/logs

summary:
  summaryLengthRatio: 0.15
`;

    await fs.writeFile(configPath, testConfig, 'utf-8');
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir);
  });

  it('应该成功构建AppContext', () => {
    const ctx = buildAppContext(configPath);

    // 验证所有Adapter都已实例化
    expect(ctx.ai).toBeDefined();
    expect(ctx.storage).toBeDefined();
    expect(ctx.logger).toBeDefined();
    expect(ctx.ui).toBeDefined();

    // 验证Adapter具有正确的方法
    expect(typeof ctx.ai.chat).toBe('function');
    expect(typeof ctx.storage.saveFile).toBe('function');
    expect(typeof ctx.storage.readFile).toBe('function');
    expect(typeof ctx.logger.info).toBe('function');
    expect(typeof ctx.logger.debug).toBe('function');
    expect(typeof ctx.logger.error).toBe('function');
    expect(typeof ctx.ui.showProgress).toBe('function');
    expect(typeof ctx.ui.showMessage).toBe('function');
  });

  it('应该在配置文件不存在时抛出错误', () => {
    const nonExistentPath = path.join(testDir, 'non-existent.yaml');

    expect(() => buildAppContext(nonExistentPath)).toThrow('Config file not found');
  });

  it('应该在配置文件格式无效时抛出错误', async () => {
    const invalidConfigPath = path.join(testDir, 'invalid-config.yaml');
    await fs.writeFile(invalidConfigPath, 'invalid: yaml: content: [', 'utf-8');

    expect(() => buildAppContext(invalidConfigPath)).toThrow('Failed to parse YAML');
  });

  it('应该在配置验证失败时抛出错误', async () => {
    const invalidConfigPath = path.join(testDir, 'invalid-schema.yaml');
    const invalidConfig = `
ai:
  mainModel:
    provider: invalid-provider
    baseURL: not-a-url
`;
    await fs.writeFile(invalidConfigPath, invalidConfig, 'utf-8');

    expect(() => buildAppContext(invalidConfigPath)).toThrow('Config validation failed');
  });
});
