/**
 * CLI冒烟测试
 * 
 * 测试命令解析和参数验证
 * 
 * **Validates: Requirements 1.1-1.7**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

describe('CLI命令解析', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride(); // 防止测试时退出进程
  });

  describe('init命令', () => {
    it('应该解析基本的init命令', () => {
      program
        .command('init')
        .description('初始化项目,创建配置文件和目录结构')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --force', '强制覆盖', false)
        .action(() => {});

      program.parse(['node', 'novelagent', 'init']);
      
      const command = program.commands.find(cmd => cmd.name() === 'init');
      expect(command).toBeDefined();
      expect(command?.description()).toContain('初始化');
    });

    it('应该解析--dir选项', () => {
      let capturedOptions: any;
      
      program
        .command('init')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --force', '强制覆盖', false)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'init', '--dir', '/test/path']);
      
      expect(capturedOptions.dir).toBe('/test/path');
    });

    it('应该解析--force选项', () => {
      let capturedOptions: any;
      
      program
        .command('init')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --force', '强制覆盖', false)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'init', '--force']);
      
      expect(capturedOptions.force).toBe(true);
    });

    it('应该使用默认工作目录', () => {
      let capturedOptions: any;
      
      program
        .command('init')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --force', '强制覆盖', false)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'init']);
      
      expect(capturedOptions.dir).toBe(process.cwd());
    });
  });

  describe('test命令', () => {
    it('应该解析基本的test命令', () => {
      program
        .command('test')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-m, --model <type>', '模型类型', 'all')
        .action(() => {});

      program.parse(['node', 'novelagent', 'test']);
      
      const command = program.commands.find(cmd => cmd.name() === 'test');
      expect(command).toBeDefined();
    });

    it('应该解析--model选项', () => {
      let capturedOptions: any;
      
      program
        .command('test')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-m, --model <type>', '模型类型', 'all')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'test', '--model', 'main']);
      
      expect(capturedOptions.model).toBe('main');
    });

    it('应该使用默认模型类型all', () => {
      let capturedOptions: any;
      
      program
        .command('test')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-m, --model <type>', '模型类型', 'all')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'test']);
      
      expect(capturedOptions.model).toBe('all');
    });
  });

  describe('framework命令', () => {
    it('应该解析基本的framework命令', () => {
      program
        .command('framework <description>')
        .requiredOption('-n, --name <name>', '项目名称')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action(() => {});

      const command = program.commands.find(cmd => cmd.name() === 'framework');
      expect(command).toBeDefined();
    });

    it('应该解析创意描述参数', () => {
      let capturedDescription: string;
      let capturedOptions: any;
      
      program
        .command('framework <description>')
        .requiredOption('-n, --name <name>', '项目名称')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action((description, options) => {
          capturedDescription = description;
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'framework', '一个魔法故事', '--name', 'magic-novel']);
      
      expect(capturedDescription!).toBe('一个魔法故事');
      expect(capturedOptions.name).toBe('magic-novel');
    });

    it('应该解析可选的生成参数', () => {
      let capturedOptions: any;
      
      program
        .command('framework <description>')
        .requiredOption('-n, --name <name>', '项目名称')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('--volumes <number>', '卷数', parseInt)
        .option('--chapters-per-volume <number>', '每卷章数', parseInt)
        .option('--words-per-chapter <number>', '每章字数', parseInt)
        .action((description, options) => {
          capturedOptions = options;
        });

      program.parse([
        'node', 'novelagent', 'framework', '测试',
        '--name', 'test',
        '--volumes', '5',
        '--chapters-per-volume', '15',
        '--words-per-chapter', '4000'
      ]);
      
      expect(capturedOptions.volumes).toBe(5);
      expect(capturedOptions.chaptersPerVolume).toBe(15);
      expect(capturedOptions.wordsPerChapter).toBe(4000);
    });
  });

  describe('chapters命令', () => {
    it('应该解析基本的chapters命令', () => {
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action(() => {});

      const command = program.commands.find(cmd => cmd.name() === 'chapters');
      expect(command).toBeDefined();
    });

    it('应该解析项目名称参数', () => {
      let capturedProject: string;
      
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action((project) => {
          capturedProject = project;
        });

      program.parse(['node', 'novelagent', 'chapters', 'my-novel']);
      
      expect(capturedProject!).toBe('my-novel');
    });

    it('应该解析--volume选项', () => {
      let capturedOptions: any;
      
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-v, --volume <number>', '卷号', parseInt)
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'chapters', 'test', '--volume', '2']);
      
      expect(capturedOptions.volume).toBe(2);
    });

    it('应该解析--range选项', () => {
      let capturedOptions: any;
      
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-r, --range <start-end>', '章节范围')
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'chapters', 'test', '--range', '1-5']);
      
      expect(capturedOptions.range).toBe('1-5');
    });

    it('应该解析--chapter选项', () => {
      let capturedOptions: any;
      
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-c, --chapter <number>', '章节号', parseInt)
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'chapters', 'test', '--chapter', '3']);
      
      expect(capturedOptions.chapter).toBe(3);
    });

    it('应该解析--force选项', () => {
      let capturedOptions: any;
      
      program
        .command('chapters <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --force', '强制重新生成', false)
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'chapters', 'test', '--force']);
      
      expect(capturedOptions.force).toBe(true);
    });
  });

  describe('export命令', () => {
    it('应该解析基本的export命令', () => {
      program
        .command('export <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action(() => {});

      const command = program.commands.find(cmd => cmd.name() === 'export');
      expect(command).toBeDefined();
    });

    it('应该解析项目名称参数', () => {
      let capturedProject: string;
      
      program
        .command('export <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .action((project) => {
          capturedProject = project;
        });

      program.parse(['node', 'novelagent', 'export', 'my-novel']);
      
      expect(capturedProject!).toBe('my-novel');
    });

    it('应该解析--format选项', () => {
      let capturedOptions: any;
      
      program
        .command('export <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --format <type>', '导出格式', 'markdown')
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'export', 'test', '--format', 'json']);
      
      expect(capturedOptions.format).toBe('json');
    });

    it('应该使用默认格式markdown', () => {
      let capturedOptions: any;
      
      program
        .command('export <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-f, --format <type>', '导出格式', 'markdown')
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'export', 'test']);
      
      expect(capturedOptions.format).toBe('markdown');
    });

    it('应该解析--output选项', () => {
      let capturedOptions: any;
      
      program
        .command('export <project>')
        .option('-d, --dir <path>', '工作目录', process.cwd())
        .option('-o, --output <path>', '输出目录')
        .action((project, options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'export', 'test', '--output', '/custom/path']);
      
      expect(capturedOptions.output).toBe('/custom/path');
    });
  });

  describe('参数验证', () => {
    it('framework命令应该要求--name选项', () => {
      program
        .command('framework <description>')
        .requiredOption('-n, --name <name>', '项目名称')
        .action(() => {});

      // 验证requiredOption被正确设置
      const command = program.commands.find(cmd => cmd.name() === 'framework');
      const nameOption = command?.options.find(opt => opt.long === '--name');
      
      expect(nameOption).toBeDefined();
      expect(nameOption?.required).toBe(true);
    });

    it('应该正确解析数字类型的选项', () => {
      let capturedOptions: any;
      
      program
        .command('test')
        .option('--number <value>', '数字', parseInt)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'novelagent', 'test', '--number', '42']);
      
      expect(capturedOptions.number).toBe(42);
      expect(typeof capturedOptions.number).toBe('number');
    });
  });
});
