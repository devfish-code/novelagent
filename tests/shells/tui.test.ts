/**
 * TUI Shell 冒烟测试
 * 
 * 测试目标:
 * - 验证TUI模块可以正确导入
 * - 验证主要函数存在
 * 
 * 注意: TUI是交互式界面,完整的功能测试需要模拟用户输入,
 * 这里只进行基本的冒烟测试确保模块结构正确
 */

import { describe, it, expect } from 'vitest';

describe('TUI Shell', () => {
  it('应该能够导入TUI模块', async () => {
    const tuiModule = await import('../../src/shells/tui/index.js');
    expect(tuiModule).toBeDefined();
  });

  it('应该导出startTUI函数', async () => {
    const { startTUI } = await import('../../src/shells/tui/index.js');
    expect(startTUI).toBeDefined();
    expect(typeof startTUI).toBe('function');
  });

  it('TUI模块应该包含必要的依赖', async () => {
    // 验证@inquirer/prompts可以导入
    const inquirer = await import('@inquirer/prompts');
    expect(inquirer.select).toBeDefined();
    expect(inquirer.input).toBeDefined();
    expect(inquirer.confirm).toBeDefined();
  });

  it('应该能够导入chalk用于彩色输出', async () => {
    const chalk = await import('chalk');
    expect(chalk.default).toBeDefined();
  });
});
