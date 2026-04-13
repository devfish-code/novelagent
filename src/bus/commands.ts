/**
 * Command类型定义
 * Command是用户操作的抽象表示,由Shell层构建,Bus层分发
 */

/**
 * 初始化项目Command
 */
export interface InitProjectCommand {
  type: 'INIT_PROJECT';
  payload: {
    dir: string;
    force: boolean;
  };
}

/**
 * 测试AI连接Command
 */
export interface TestAIConnectionCommand {
  type: 'TEST_AI_CONNECTION';
  payload: {
    model: 'main' | 'json' | 'all';
  };
}

/**
 * 生成小说框架Command
 */
export interface GenerateFrameworkCommand {
  type: 'GENERATE_FRAMEWORK';
  payload: {
    creativeDescription: string;
    projectName: string;
    dir: string;
    volumes?: number;
    chaptersPerVolume?: number;
    wordsPerChapter?: number;
  };
}

/**
 * 生成章节Command
 */
export interface GenerateChaptersCommand {
  type: 'GENERATE_CHAPTERS';
  payload: {
    projectName: string;
    dir: string;
    volume?: number;
    startChapter?: number;
    endChapter?: number;
    specificChapter?: number;
    force: boolean;
  };
}

/**
 * 导出项目Command
 */
export interface ExportProjectCommand {
  type: 'EXPORT_PROJECT';
  payload: {
    projectName: string;
    dir: string;
    format: 'markdown' | 'json';
    outputDir?: string;
  };
}

/**
 * Command联合类型
 */
export type Command =
  | InitProjectCommand
  | TestAIConnectionCommand
  | GenerateFrameworkCommand
  | GenerateChaptersCommand
  | ExportProjectCommand;

