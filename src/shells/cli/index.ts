#!/usr/bin/env node
/**
 * CLI Shell
 * 使用Commander.js实现命令行界面
 * 
 * 架构约束: 每个命令处理器限制在10行以内
 * 职责: 解析参数 → 构建Command → 调用dispatch → 格式化输出
 * 
 * **Validates: Requirements 1.1-1.7, 2.1-2.7, 3.1-3.16, 4.1-4.26, 5.1-5.14, 7.1-7.6, 8.6**
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { buildAppContext } from '../contextBuilder.js';
import { dispatch, type CommandResult } from '../../bus/dispatcher.js';
import type {
  InitProjectCommand,
  TestAIConnectionCommand,
  GenerateFrameworkCommand,
  GenerateChaptersCommand,
  ExportProjectCommand,
} from '../../bus/commands.js';
import { FileSystemStorageAdapter } from '../../adapters/storageAdapter.js';
import { FileLoggerAdapter } from '../../adapters/loggerAdapter.js';
import { ConsoleUIAdapter } from '../../adapters/uiAdapter.js';

const program = new Command();

program
  .name('novelagent')
  .description('AI驱动的长篇小说自动生成CLI工具')
  .version('0.1.0');

/**
 * 通用错误处理和输出格式化
 */
function handleResult(result: CommandResult, successMessage: string): void {
  if (!result.success) {
    console.error(chalk.red(`✗ ${result.error?.message}`));
    if (result.error?.details?.suggestion) {
      console.log(chalk.gray(`提示: ${result.error.details.suggestion}`));
    }
    process.exit(1);
  }
  console.log(chalk.green(`✓ ${successMessage}`));
}

/**
 * init命令: 初始化项目
 */
program
  .command('init')
  .description('初始化项目,创建配置文件和目录结构')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-f, --force', '强制覆盖已存在的配置文件', false)
  .action(async (options) => {
    // 为init命令创建最小化的context (不需要加载配置文件)
    const ctx = { storage: new FileSystemStorageAdapter(), logger: new FileLoggerAdapter({ logLevel: 'info', logDir: 'logs' }), ui: new ConsoleUIAdapter(), ai: null as any };
    const cmd: InitProjectCommand = { type: 'INIT_PROJECT', payload: { dir: options.dir, force: options.force } };
    const result = await dispatch(ctx, cmd);
    handleResult(result, (result.data as any)?.message || '项目初始化成功');
  });

/**
 * test命令: 测试AI连接
 */
program
  .command('test')
  .description('测试AI模型连接')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-m, --model <type>', '测试的模型类型 (main|json|all)', 'all')
  .action(async (options) => {
    const ctx = buildAppContext(path.join(options.dir, 'config.yaml'));
    const cmd: TestAIConnectionCommand = { type: 'TEST_AI_CONNECTION', payload: { model: options.model } };
    const result = await dispatch(ctx, cmd);
    handleResult(result, 'AI连接测试完成');
  });

/**
 * framework命令: 生成小说框架
 */
program
  .command('framework <description>')
  .description('生成小说框架(需求理解→世界构建→大纲规划)')
  .requiredOption('-n, --name <name>', '项目名称')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('--volumes <number>', '卷数', parseInt)
  .option('--chapters-per-volume <number>', '每卷章数', parseInt)
  .option('--words-per-chapter <number>', '每章字数', parseInt)
  .action(async (description, options) => {
    const ctx = buildAppContext(path.join(options.dir, 'config.yaml'));
    const cmd: GenerateFrameworkCommand = { type: 'GENERATE_FRAMEWORK', payload: { creativeDescription: description, projectName: options.name, dir: options.dir, volumes: options.volumes, chaptersPerVolume: options.chaptersPerVolume, wordsPerChapter: options.wordsPerChapter } };
    const result = await dispatch(ctx, cmd);
    handleResult(result, '小说框架生成完成');
  });

/**
 * chapters命令: 生成章节
 */
program
  .command('chapters <project>')
  .description('生成章节内容')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-v, --volume <number>', '指定卷号', parseInt)
  .option('-r, --range <start-end>', '章节范围 (例: 1-5)')
  .option('-c, --chapter <number>', '指定章节', parseInt)
  .option('-f, --force', '强制重新生成已存在的章节', false)
  .action(async (project, options) => {
    const ctx = buildAppContext(path.join(options.dir, 'config.yaml'));
    const [startChapter, endChapter] = options.range ? options.range.split('-').map(Number) : [undefined, undefined];
    const cmd: GenerateChaptersCommand = { type: 'GENERATE_CHAPTERS', payload: { projectName: project, dir: options.dir, volume: options.volume, startChapter, endChapter, specificChapter: options.chapter, force: options.force } };
    const result = await dispatch(ctx, cmd);
    handleResult(result, '章节生成完成');
  });

/**
 * export命令: 导出产物
 */
program
  .command('export <project>')
  .description('导出小说产物')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-f, --format <type>', '导出格式 (markdown|json)', 'markdown')
  .option('-o, --output <path>', '输出目录')
  .action(async (project, options) => {
    const ctx = buildAppContext(path.join(options.dir, 'config.yaml'));
    const cmd: ExportProjectCommand = { type: 'EXPORT_PROJECT', payload: { projectName: project, dir: options.dir, format: options.format, outputDir: options.output } };
    const result = await dispatch(ctx, cmd);
    handleResult(result, '导出完成');
  });

// 如果没有提供任何参数,启动TUI
if (process.argv.length === 2) {
  // 动态导入TUI以避免在CLI模式下加载不必要的依赖
  const { startTUI } = await import('../tui/index.js');
  await startTUI();
} else {
  program.parse();
}
