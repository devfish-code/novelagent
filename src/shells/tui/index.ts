#!/usr/bin/env node

import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import path from 'path';
import { buildAppContext } from '../contextBuilder.js';
import { dispatch } from '../../bus/dispatcher.js';
import type { Command } from '../../bus/commands.js';

/**
 * TUI Shell - 交互式文本用户界面
 * 
 * 职责:
 * - 显示主菜单和子菜单
 * - 收集用户输入
 * - 构建Command对象
 * - 调用dispatch执行命令
 * - 格式化输出结果
 */

interface MenuChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * 显示欢迎信息
 */
function showWelcome(): void {
  console.clear();
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     NovelAgent - AI小说生成工具       ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));
  console.log(chalk.gray('一个AI驱动的长篇小说自动生成系统\n'));
}

/**
 * 显示主菜单
 */
async function showMainMenu(): Promise<string> {
  const choices: MenuChoice[] = [
    { name: '🚀 初始化新项目', value: 'init', description: '创建配置文件和目录结构' },
    { name: '🔌 测试AI连接', value: 'test', description: '验证AI模型配置是否正确' },
    { name: '📝 生成小说框架', value: 'framework', description: '需求理解→世界构建→大纲规划' },
    { name: '✍️  生成章节', value: 'chapters', description: '根据大纲生成章节内容' },
    { name: '📦 导出产物', value: 'export', description: '导出完整小说和相关文档' },
    { name: '📊 查看生成报告', value: 'report', description: '查看项目质量报告和统计' },
    { name: '❌ 退出', value: 'exit', description: '退出程序' },
  ];

  return await select({
    message: '请选择操作:',
    choices,
  });
}

/**
 * 初始化项目流程
 */
async function handleInit(): Promise<void> {
  console.log(chalk.cyan('\n=== 初始化新项目 ===\n'));

  const dir = await input({
    message: '工作目录:',
    default: '.',
  });

  const force = await confirm({
    message: '如果配置文件已存在,是否强制覆盖?',
    default: false,
  });

  try {
    const ctx = await buildAppContext(dir);
    const command: Command = {
      type: 'INIT_PROJECT',
      payload: { dir, force },
    };

    await dispatch(ctx, command);
    console.log(chalk.green('\n✓ 项目初始化成功!'));
    console.log(chalk.gray(`配置文件: ${dir}/config.yaml`));
  } catch (error) {
    console.error(chalk.red('\n✗ 初始化失败:'), (error as Error).message);
  }

  await pressEnterToContinue();
}

/**
 * 测试AI连接流程
 */
async function handleTest(): Promise<void> {
  console.log(chalk.cyan('\n=== 测试AI连接 ===\n'));

  const dir = await input({
    message: '工作目录:',
    default: '.',
  });

  const model = await select({
    message: '选择要测试的模型:',
    choices: [
      { name: '全部模型', value: 'all' },
      { name: '仅主模型 (Main Model)', value: 'main' },
      { name: '仅JSON模型 (JSON Model)', value: 'json' },
    ],
  });

  try {
    const ctx = await buildAppContext(dir);
    const command: Command = {
      type: 'TEST_AI_CONNECTION',
      payload: { model: model as 'all' | 'main' | 'json' },
    };

    await dispatch(ctx, command);
    console.log(chalk.green('\n✓ AI连接测试完成!'));
  } catch (error) {
    console.error(chalk.red('\n✗ 测试失败:'), (error as Error).message);
  }

  await pressEnterToContinue();
}

/**
 * 生成小说框架流程
 */
async function handleFramework(): Promise<void> {
  console.log(chalk.cyan('\n=== 生成小说框架 ===\n'));

  const dir = await input({
    message: '工作目录:',
    default: '.',
  });

  const description = await input({
    message: '创意描述 (一句话描述你的小说):',
    validate: (value) => {
      if (value.length < 10) {
        return '创意描述至少需要10个字符';
      }
      return true;
    },
  });

  const name = await input({
    message: '项目名称:',
    validate: (value) => {
      if (!value.trim()) {
        return '项目名称不能为空';
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
        return '项目名称只能包含字母、数字、连字符和下划线';
      }
      return true;
    },
  });

  const volumes = await input({
    message: '卷数:',
    default: '3',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return '卷数必须是大于0的整数';
      }
      return true;
    },
  });

  const chaptersPerVolume = await input({
    message: '每卷章数:',
    default: '10',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return '每卷章数必须是大于0的整数';
      }
      return true;
    },
  });

  const wordsPerChapter = await input({
    message: '每章字数:',
    default: '3000',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 500) {
        return '每章字数必须至少500字';
      }
      return true;
    },
  });

  try {
    const ctx = await buildAppContext(dir);
    const command: Command = {
      type: 'GENERATE_FRAMEWORK',
      payload: {
        creativeDescription: description,
        projectName: name,
        dir,
        volumes: parseInt(volumes),
        chaptersPerVolume: parseInt(chaptersPerVolume),
        wordsPerChapter: parseInt(wordsPerChapter),
      },
    };

    console.log(chalk.yellow('\n⏳ 正在生成框架,这可能需要几分钟...\n'));
    await dispatch(ctx, command);
    console.log(chalk.green('\n✓ 小说框架生成成功!'));
  } catch (error) {
    console.error(chalk.red('\n✗ 生成失败:'), (error as Error).message);
  }

  await pressEnterToContinue();
}

/**
 * 生成章节流程
 */
async function handleChapters(): Promise<void> {
  console.log(chalk.cyan('\n=== 生成章节 ===\n'));

  const dir = await input({
    message: '工作目录:',
    default: '.',
  });

  const project = await input({
    message: '项目名称:',
    validate: (value) => {
      if (!value.trim()) {
        return '项目名称不能为空';
      }
      return true;
    },
  });

  const rangeType = await select({
    message: '选择生成范围:',
    choices: [
      { name: '全部章节 (断点续传)', value: 'all' },
      { name: '指定卷', value: 'volume' },
      { name: '指定章节范围', value: 'range' },
      { name: '单个章节', value: 'single' },
    ],
  });

  let volume: number | undefined;
  let startChapter: number | undefined;
  let endChapter: number | undefined;
  let specificChapter: number | undefined;

  if (rangeType === 'volume') {
    const volumeInput = await input({
      message: '卷号:',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return '卷号必须是大于0的整数';
        }
        return true;
      },
    });
    volume = parseInt(volumeInput);
  } else if (rangeType === 'range') {
    const rangeInput = await input({
      message: '章节范围 (例如: 1-5):',
      validate: (value) => {
        if (!/^\d+-\d+$/.test(value)) {
          return '范围格式错误,应为: 起始章-结束章 (例如: 1-5)';
        }
        return true;
      },
    });
    const [start, end] = rangeInput.split('-').map(Number);
    startChapter = start;
    endChapter = end;
  } else if (rangeType === 'single') {
    const chapterInput = await input({
      message: '章节号:',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return '章节号必须是大于0的整数';
        }
        return true;
      },
    });
    specificChapter = parseInt(chapterInput);
  }

  const force = await confirm({
    message: '是否重新生成已存在的章节?',
    default: false,
  });

  try {
    const ctx = await buildAppContext(dir);
    const command: Command = {
      type: 'GENERATE_CHAPTERS',
      payload: {
        projectName: project,
        dir,
        volume,
        startChapter,
        endChapter,
        specificChapter,
        force,
      },
    };

    console.log(chalk.yellow('\n⏳ 正在生成章节,这可能需要较长时间...\n'));
    await dispatch(ctx, command);
    console.log(chalk.green('\n✓ 章节生成完成!'));
  } catch (error) {
    console.error(chalk.red('\n✗ 生成失败:'), (error as Error).message);
  }

  await pressEnterToContinue();
}

/**
 * 导出产物流程
 */
async function handleExport(): Promise<void> {
  console.log(chalk.cyan('\n=== 导出产物 ===\n'));

  const dir = await input({
    message: '工作目录:',
    default: '.',
  });

  const project = await input({
    message: '项目名称:',
    validate: (value) => {
      if (!value.trim()) {
        return '项目名称不能为空';
      }
      return true;
    },
  });

  const format = await select({
    message: '导出格式:',
    choices: [
      { name: 'Markdown', value: 'markdown' },
      { name: 'JSON', value: 'json' },
    ],
  });

  const output = await input({
    message: '输出目录 (留空使用默认exports目录):',
    default: '',
  });

  try {
    const ctx = await buildAppContext(dir);
    const command: Command = {
      type: 'EXPORT_PROJECT',
      payload: {
        projectName: project,
        dir,
        format: format as 'markdown' | 'json',
        outputDir: output || undefined,
      },
    };

    console.log(chalk.yellow('\n⏳ 正在导出...\n'));
    await dispatch(ctx, command);
    console.log(chalk.green('\n✓ 导出完成!'));
  } catch (error) {
    console.error(chalk.red('\n✗ 导出失败:'), (error as Error).message);
  }

  await pressEnterToContinue();
}

/**
 * 查看生成报告流程
 */
async function handleReport(): Promise<void> {
  console.log(chalk.cyan('\n=== 查看生成报告 ===\n'));

  try {
    // 获取工作目录
    const workDir = await input({
      message: '请输入工作目录路径:',
      default: process.cwd(),
    });

    // 扫描项目目录
    const ctx = buildAppContext(path.join(workDir, 'config.yaml'));
    const entries = await ctx.storage.listDir(workDir);
    
    // 查找所有包含project.json的目录
    const projects: string[] = [];
    for (const entry of entries) {
      const projectJsonPath = path.join(workDir, entry, 'project.json');
      const exists = await ctx.storage.fileExists(projectJsonPath);
      if (exists) {
        projects.push(entry);
      }
    }

    if (projects.length === 0) {
      console.log(chalk.yellow('\n未找到任何小说项目'));
      console.log(chalk.gray('提示: 请先使用 "生成小说框架" 创建项目'));
      await pressEnterToContinue();
      return;
    }

    // 让用户选择项目
    const projectName = await select({
      message: '请选择要查看的项目:',
      choices: projects.map(p => ({ name: p, value: p })),
    });

    // 读取报告文件
    const reportPath = path.join(workDir, projectName, 'report.md');
    const reportExists = await ctx.storage.fileExists(reportPath);

    if (!reportExists) {
      console.log(chalk.yellow(`\n项目 "${projectName}" 尚未生成报告`));
      console.log(chalk.gray('提示: 请先完成章节生成'));
      await pressEnterToContinue();
      return;
    }

    const reportContent = await ctx.storage.readFile(reportPath);

    // 显示报告
    console.log(chalk.green(`\n📊 项目 "${projectName}" 生成报告:\n`));
    console.log(reportContent);

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ 查看报告失败: ${error.message}`));
    }
  }

  await pressEnterToContinue();
}

/**
 * 等待用户按回车继续
 */
async function pressEnterToContinue(): Promise<void> {
  await input({
    message: '\n按回车键返回主菜单...',
  });
}

/**
 * 主循环
 */
async function mainLoop(): Promise<void> {
  while (true) {
    showWelcome();

    const action = await showMainMenu();

    if (action === 'exit') {
      console.log(chalk.cyan('\n感谢使用 NovelAgent! 再见! 👋\n'));
      process.exit(0);
    }

    try {
      switch (action) {
        case 'init':
          await handleInit();
          break;
        case 'test':
          await handleTest();
          break;
        case 'framework':
          await handleFramework();
          break;
        case 'chapters':
          await handleChapters();
          break;
        case 'export':
          await handleExport();
          break;
        case 'report':
          await handleReport();
          break;
        default:
          console.log(chalk.red('\n未知操作'));
      }
    } catch (error) {
      console.error(chalk.red('\n发生错误:'), (error as Error).message);
      await pressEnterToContinue();
    }
  }
}

/**
 * 启动TUI
 */
export async function startTUI(): Promise<void> {
  try {
    await mainLoop();
  } catch (error) {
    console.error(chalk.red('\nTUI启动失败:'), (error as Error).message);
    process.exit(1);
  }
}

// 如果直接运行此文件,启动TUI
if (import.meta.url === `file://${process.argv[1]}`) {
  startTUI();
}
