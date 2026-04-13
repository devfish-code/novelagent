/**
 * 完整工作流E2E测试
 * 
 * 测试从init到export的完整流程
 * 使用真实的AI API(需要API Key)
 * 验证生成的文件结构和内容
 * 
 * Requirements: 1.1-1.7, 2.1-2.7, 3.1-3.16, 4.1-4.26, 5.1-5.14
 * 
 * 注意: 此测试需要真实的AI API Key,通过环境变量提供:
 * - NOVELAGENT_TEST_API_KEY: OpenAI兼容API的Key
 * - NOVELAGENT_TEST_BASE_URL: API基础URL (可选,默认为OpenAI)
 * - NOVELAGENT_TEST_MODEL: 模型名称 (可选,默认为gpt-3.5-turbo)
 * 
 * 运行方式:
 * NOVELAGENT_TEST_API_KEY=your-key npm test -- tests/e2e/complete-workflow.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildAppContext } from '../../src/shells/contextBuilder.js';
import { dispatch } from '../../src/bus/dispatcher.js';
import type {
  InitProjectCommand,
  TestAIConnectionCommand,
  GenerateFrameworkCommand,
  GenerateChaptersCommand,
  ExportProjectCommand,
} from '../../src/bus/commands.js';

// 跳过测试如果没有提供API Key
const shouldSkip = !process.env.NOVELAGENT_TEST_API_KEY;
const skipMessage = 'Skipping E2E test: NOVELAGENT_TEST_API_KEY not provided';

describe.skipIf(shouldSkip)('E2E: 完整小说生成流程', () => {
  let testDir: string;
  let projectName: string;
  let configPath: string;

  beforeAll(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `novelagent-e2e-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    projectName = 'test-novel';
    configPath = path.join(testDir, 'config.yaml');

    console.log(`\n📁 测试目录: ${testDir}`);
    console.log(`📝 项目名称: ${projectName}\n`);
  });

  afterAll(async () => {
    // 清理测试目录 (可选,用于调试时保留)
    if (process.env.NOVELAGENT_KEEP_TEST_DIR !== 'true') {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
        console.log(`\n🧹 已清理测试目录: ${testDir}`);
      } catch (error) {
        console.warn(`⚠️  清理测试目录失败: ${error}`);
      }
    } else {
      console.log(`\n📦 保留测试目录: ${testDir}`);
    }
  });

  it('步骤1: 初始化项目', async () => {
    // 创建最小化context用于init命令
    const { FileSystemStorageAdapter } = await import('../../src/adapters/storageAdapter.js');
    const { FileLoggerAdapter } = await import('../../src/adapters/loggerAdapter.js');
    const { ConsoleUIAdapter } = await import('../../src/adapters/uiAdapter.js');
    
    const ctx = {
      storage: new FileSystemStorageAdapter(),
      logger: new FileLoggerAdapter({ logLevel: 'info', logDir: path.join(testDir, 'logs') }),
      ui: new ConsoleUIAdapter(),
      ai: null as any,
    };

    const command: InitProjectCommand = {
      type: 'INIT_PROJECT',
      payload: {
        dir: testDir,
        force: false,
      },
    };

    console.log('🚀 执行: novelagent init');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');

    // 验证文件结构
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);

    // 验证目录结构
    const dirs = ['logs', 'world', 'outline', 'chapters', 'exports'];
    for (const dir of dirs) {
      const dirPath = path.join(testDir, dir);
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    }

    console.log('✅ 项目初始化成功\n');
  }, 30000);

  it('步骤2: 配置AI模型', async () => {
    // 读取生成的配置文件
    const configContent = await fs.readFile(configPath, 'utf-8');
    expect(configContent).toContain('mainModel:');
    expect(configContent).toContain('jsonModel:');

    // 更新配置文件,使用测试环境的API Key
    const apiKey = process.env.NOVELAGENT_TEST_API_KEY!;
    const baseURL = process.env.NOVELAGENT_TEST_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.NOVELAGENT_TEST_MODEL || 'gpt-3.5-turbo';

    const updatedConfig = configContent
      .replace(/apiKey: "your-api-key-here"/g, `apiKey: "${apiKey}"`)
      .replace(/baseURL: "https:\/\/api\.openai\.com\/v1"/g, `baseURL: "${baseURL}"`)
      .replace(/model: "gpt-4"/g, `model: "${model}"`)
      .replace(/model: "gpt-4-turbo"/g, `model: "${model}"`);

    await fs.writeFile(configPath, updatedConfig, 'utf-8');

    console.log('✅ AI模型配置完成\n');
  });

  it('步骤3: 测试AI连接', async () => {
    const ctx = buildAppContext(configPath);

    const command: TestAIConnectionCommand = {
      type: 'TEST_AI_CONNECTION',
      payload: {
        model: 'all',
      },
    };

    console.log('🔌 执行: novelagent test --model all');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('results');
    
    const data = result.data as { results: Array<{ model: string; success: boolean; responseTime?: number; error?: string }> };
    expect(data.results).toHaveLength(2); // main + json

    // 验证两个模型都连接成功
    for (const testResult of data.results) {
      expect(testResult.success).toBe(true);
      expect(testResult.responseTime).toBeGreaterThan(0);
      console.log(`  ✓ ${testResult.model}: ${testResult.responseTime}ms`);
    }

    console.log('✅ AI连接测试通过\n');
  }, 60000);

  it('步骤4: 生成小说框架', async () => {
    const ctx = buildAppContext(configPath);

    const command: GenerateFrameworkCommand = {
      type: 'GENERATE_FRAMEWORK',
      payload: {
        creativeDescription: '一个关于年轻程序员意外穿越到古代,利用现代编程思维解决古代问题的轻松幽默故事',
        projectName,
        dir: testDir,
        volumes: 1,
        chaptersPerVolume: 3,
        wordsPerChapter: 1000, // 使用较小的字数以加快测试
      },
    };

    console.log('📚 执行: novelagent framework "..." --name test-novel');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);

    // 验证项目目录创建
    const projectDir = path.join(testDir, projectName);
    const projectExists = await fs.access(projectDir).then(() => true).catch(() => false);
    expect(projectExists).toBe(true);

    // 验证requirements.md
    const requirementsPath = path.join(projectDir, 'requirements.md');
    const requirementsExists = await fs.access(requirementsPath).then(() => true).catch(() => false);
    expect(requirementsExists).toBe(true);
    
    const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
    expect(requirementsContent).toContain('novelType:');
    expect(requirementsContent).toContain('targetAudience:');
    expect(requirementsContent).toContain('coreConflict:');

    // 验证world目录和角色档案
    const worldDir = path.join(projectDir, 'world');
    const worldExists = await fs.access(worldDir).then(() => true).catch(() => false);
    expect(worldExists).toBe(true);

    const worldFiles = await fs.readdir(worldDir);
    expect(worldFiles.length).toBeGreaterThan(0);
    expect(worldFiles.some(f => f.includes('character'))).toBe(true);

    // 验证outline目录
    const outlineDir = path.join(projectDir, 'outline');
    const outlineExists = await fs.access(outlineDir).then(() => true).catch(() => false);
    expect(outlineExists).toBe(true);

    const outlineFiles = await fs.readdir(outlineDir);
    expect(outlineFiles).toContain('novel.yaml');
    expect(outlineFiles.some(f => f.startsWith('volume-'))).toBe(true);

    // 验证project.json
    const projectJsonPath = path.join(projectDir, 'project.json');
    const projectJsonExists = await fs.access(projectJsonPath).then(() => true).catch(() => false);
    expect(projectJsonExists).toBe(true);

    const projectJson = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    expect(projectJson.projectName).toBe(projectName);
    expect(projectJson.config.volumes).toBe(1);
    expect(projectJson.config.chaptersPerVolume).toBe(3);
    expect(projectJson.progress.totalChapters).toBe(3);

    console.log('✅ 小说框架生成完成');
    console.log(`  - 需求文档: ${requirementsPath}`);
    console.log(`  - 世界设定: ${worldDir}`);
    console.log(`  - 大纲: ${outlineDir}\n`);
  }, 300000); // 5分钟超时

  it('步骤5: 生成第一章', async () => {
    const ctx = buildAppContext(configPath);

    const command: GenerateChaptersCommand = {
      type: 'GENERATE_CHAPTERS',
      payload: {
        projectName,
        dir: testDir,
        specificChapter: 1,
        force: false,
      },
    };

    console.log('✍️  执行: novelagent chapters test-novel --chapter 1');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);

    // 验证章节文件
    const chaptersDir = path.join(testDir, projectName, 'chapters');
    const chapterFiles = await fs.readdir(chaptersDir);
    const chapter1File = chapterFiles.find(f => f.includes('chapter-1') && f.endsWith('.md'));
    expect(chapter1File).toBeDefined();

    // 验证章节内容
    const chapter1Path = path.join(chaptersDir, chapter1File!);
    const chapter1Content = await fs.readFile(chapter1Path, 'utf-8');
    expect(chapter1Content.length).toBeGreaterThan(500); // 至少有一些内容
    expect(chapter1Content).toContain('第'); // 中文章节标题

    // 验证project.json更新
    const projectJsonPath = path.join(testDir, projectName, 'project.json');
    const projectJson = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    expect(projectJson.progress.completedChapters).toBe(1);
    expect(projectJson.chapters[0].status).toBe('completed');
    expect(projectJson.chapters[0].wordCount).toBeGreaterThan(0);

    console.log('✅ 第一章生成完成');
    console.log(`  - 文件: ${chapter1Path}`);
    console.log(`  - 字数: ${projectJson.chapters[0].wordCount}\n`);
  }, 300000); // 5分钟超时

  it('步骤6: 生成剩余章节', async () => {
    const ctx = buildAppContext(configPath);

    const command: GenerateChaptersCommand = {
      type: 'GENERATE_CHAPTERS',
      payload: {
        projectName,
        dir: testDir,
        force: false,
      },
    };

    console.log('✍️  执行: novelagent chapters test-novel (断点续传)');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);

    // 验证所有章节文件
    const chaptersDir = path.join(testDir, projectName, 'chapters');
    const chapterFiles = await fs.readdir(chaptersDir);
    const mdFiles = chapterFiles.filter(f => f.endsWith('.md') && f.includes('chapter-'));
    expect(mdFiles.length).toBe(3); // 总共3章

    // 验证project.json
    const projectJsonPath = path.join(testDir, projectName, 'project.json');
    const projectJson = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    expect(projectJson.progress.completedChapters).toBe(3);
    expect(projectJson.status).toBe('completed');

    // 验证所有章节都已完成
    for (const chapter of projectJson.chapters) {
      expect(chapter.status).toBe('completed');
      expect(chapter.wordCount).toBeGreaterThan(0);
    }

    // 验证report.md生成
    const reportPath = path.join(testDir, projectName, 'report.md');
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    expect(reportExists).toBe(true);

    const reportContent = await fs.readFile(reportPath, 'utf-8');
    expect(reportContent).toContain('生成报告');
    expect(reportContent).toContain('章节统计');
    expect(reportContent).toContain('字数统计');

    console.log('✅ 所有章节生成完成');
    console.log(`  - 总章节数: ${mdFiles.length}`);
    console.log(`  - 总字数: ${projectJson.statistics.totalWords}`);
    console.log(`  - 报告: ${reportPath}\n`);
  }, 600000); // 10分钟超时

  it('步骤7: 导出产物', async () => {
    const ctx = buildAppContext(configPath);

    const command: ExportProjectCommand = {
      type: 'EXPORT_PROJECT',
      payload: {
        projectName,
        dir: testDir,
        format: 'markdown',
        outputDir: path.join(testDir, 'exports'),
      },
    };

    console.log('📦 执行: novelagent export test-novel');
    const result = await dispatch(ctx, command);

    // 验证结果
    expect(result.success).toBe(true);

    // 验证导出目录
    const exportsDir = path.join(testDir, 'exports');
    const exportExists = await fs.access(exportsDir).then(() => true).catch(() => false);
    expect(exportExists).toBe(true);

    // 验证导出文件
    const exportFiles = await fs.readdir(exportsDir);
    const expectedFiles = [
      'novel.md',
      'world.md',
      'characters.md',
      'outline.md',
      'timeline.md',
      'report.md',
    ];

    for (const file of expectedFiles) {
      expect(exportFiles).toContain(file);
      
      // 验证文件内容不为空
      const filePath = path.join(exportsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }

    // 验证novel.md包含所有章节
    const novelPath = path.join(exportsDir, 'novel.md');
    const novelContent = await fs.readFile(novelPath, 'utf-8');
    expect(novelContent).toContain('第1章');
    expect(novelContent).toContain('第2章');
    expect(novelContent).toContain('第3章');

    console.log('✅ 导出完成');
    console.log(`  - 导出目录: ${exportsDir}`);
    console.log(`  - 文件数: ${exportFiles.length}`);
    for (const file of expectedFiles) {
      console.log(`    ✓ ${file}`);
    }
    console.log();
  }, 60000);

  it('步骤8: 验证完整性', async () => {
    // 验证整个项目结构的完整性
    const projectDir = path.join(testDir, projectName);

    // 验证所有必需目录存在
    const requiredDirs = ['world', 'outline', 'chapters'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(projectDir, dir);
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }

    // 验证所有必需文件存在
    const requiredFiles = [
      'requirements.md',
      'project.json',
      'report.md',
    ];
    for (const file of requiredFiles) {
      const filePath = path.join(projectDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }

    // 验证日志文件
    const logsDir = path.join(testDir, 'logs');
    const logFiles = await fs.readdir(logsDir);
    expect(logFiles.length).toBeGreaterThan(0);

    // 验证AI对话日志
    const aiConversationsDir = path.join(logsDir, 'ai-conversations');
    const aiConvExists = await fs.access(aiConversationsDir).then(() => true).catch(() => false);
    expect(aiConvExists).toBe(true);

    console.log('✅ 完整性验证通过');
    console.log('\n🎉 完整工作流测试成功完成!\n');
  });
});

// 如果没有API Key,显示跳过信息
if (shouldSkip) {
  console.log(`\n⚠️  ${skipMessage}`);
  console.log('💡 提示: 设置环境变量 NOVELAGENT_TEST_API_KEY 以运行E2E测试\n');
}
