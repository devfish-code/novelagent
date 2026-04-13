/**
 * UI Adapter实现
 * 实现控制台UI输出,使用chalk实现彩色输出
 */

import chalk from 'chalk';
import { UIPort } from '../core/ports.js';

/**
 * 控制台UI适配器
 */
export class ConsoleUIAdapter implements UIPort {
  /**
   * 显示进度信息
   */
  showProgress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(current, total);
    
    console.log(
      chalk.cyan(`[${current}/${total}]`) +
      ' ' +
      progressBar +
      ' ' +
      chalk.gray(`${percentage}%`) +
      ' ' +
      message
    );
  }

  /**
   * 显示消息
   */
  showMessage(type: 'info' | 'success' | 'warning' | 'error', message: string): void {
    switch (type) {
      case 'info':
        console.log(chalk.blue('ℹ') + ' ' + message);
        break;
      case 'success':
        console.log(chalk.green('✓') + ' ' + message);
        break;
      case 'warning':
        console.log(chalk.yellow('⚠') + ' ' + message);
        break;
      case 'error':
        console.log(chalk.red('✗') + ' ' + message);
        break;
    }
  }

  /**
   * 创建进度条
   */
  private createProgressBar(current: number, total: number, width: number = 20): string {
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));

    return `[${filledBar}${emptyBar}]`;
  }
}
