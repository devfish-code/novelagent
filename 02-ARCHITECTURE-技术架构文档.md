# NovelAgent — 技术架构文档

## 1. 技术栈总览

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|---------|------|---------|
| 语言 | TypeScript | 5.0+ | 类型安全，开发效率高 |
| 运行时 | Node.js | 20+ | LTS版本，稳定支持 |
| 模块系统 | ES Modules | - | 现代标准，tree-shaking友好 |
| CLI框架 | Commander.js | 13.x | 成熟的CLI框架，支持子命令 |
| TUI框架 | @inquirer/prompts | 7.x | 交互式命令行界面 |
| 配置解析 | YAML + JSON | - | 人类可读，易于编辑 |
| 类型校验 | Zod | 4.x | 运行时类型安全，错误提示友好 |
| 样式 | Chalk | 5.x | 命令行颜色输出 |
| 文件操作 | fs-extra | 11.x | Promise API，增强功能 |
| JSON修复 | jsonrepair | 3.x | 处理AI生成的不完整JSON |
| 测试框架 | Vitest | 4.x | 快速，ESM原生支持 |
| HTTP客户端 | 原生fetch | - | Node 20+ 内置，无需额外依赖 |

---

## 2. 系统架构

### 2.1 Core-Shell三层架构

```
┌─────────────────────────────────────────────────────────┐
│  SHELLS（轻量适配层）                                    │
│  CLI (Commander.js) │ TUI (@inquirer/prompts)           │
│  - 命令解析            - 交互式菜单                      │
│  - 参数验证            - 进度显示                        │
└────────────────────┬────────────────────────────────────┘
                     │ Command { type, payload }
                     ▼
┌─────────────────────────────────────────────────────────┐
│  COMMAND BUS（网关层）                                   │
│  - dispatch(cmd) → 调用use case → 执行effects           │
│  - 工作流编排（五阶段）                                  │
│  - 强制修复循环实现                                      │
└────────────────────┬────────────────────────────────────┘
                     │ fn(Input) → Result<Output, Error>
                     ▼
┌─────────────────────────────────────────────────────────┐
│  CORE（纯逻辑层）                                        │
│  - Use Cases: 五阶段工作流实现                           │
│  - Domain Models: 角色、地点、大纲等                     │
│  - Effects: AI_CHAT, SAVE_FILE, VALIDATE等             │
│  - Rules: 九项校验规则                                   │
│  - RAG: 上下文组装器                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  ADAPTERS（适配器层）                                    │
│  - AI Adapter: OpenAI API兼容                            │
│  - Storage Adapter: 本地文件系统                         │
│  - Logger Adapter: 文件日志                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层规则

| 层 | 职责 | 允许的依赖 | 测试策略 | 测试占比 |
|-------|---------------|---------------------|---------------|-----------|
| **Core** | 全部业务逻辑 | 仅限：Zod、chalk（日志颜色） | 对每个函数直接做单元测试 | ~90% |
| **Bus** | 命令分发 + 副作用执行 | Core + 适配器接口 | 用 mock 依赖做集成测试 | ~8% |
| **Shell** | 将外部 I/O 转换为 Command | Bus + CLI/TUI框架 | 仅做冒烟测试 | ~2% |

### 2.3 铁律

1. **Core 绝不能导入任何框架。** 不能有 `commander`、`inquirer`。所有副作用通过 Effect 声明。

2. **Use case 绝不能执行 I/O。** 它们返回的是 `Effect` 声明，Bus 层统一执行。

3. **每个 Shell 处理器控制在 10 行以内。** 只做：解析输入 → 构建 Command → 调用 dispatch → 格式化输出。

4. **Ports 是在 core 中定义、在 adapters 中实现的接口。** Core 只表达"我需要什么能力"，不关心实现。

---

## 3. Core 层详细设计

### 3.1 Use Cases：五阶段工作流

```typescript
// src/core/usecases/phase1UnderstandRequirements.ts
export function phase1UnderstandRequirements(
  input: Phase1Input
): Phase1Output {
  // 1. 解析创意描述
  // 2. 构建需求结构化数据
  // 3. 返回 Effects: [AI_CHAT] 用于细化需求
}

// src/core/usecases/phase2WorldBuilding.ts
export function phase2WorldBuilding(
  input: Phase2Input
): Phase2Output {
  // 1. 生成世界观
  // 2. 生成角色档案
  // 3. 生成地点档案
  // 4. 生成规则体系
  // 5. 一致性校验
  // 返回 Effects: [AI_CHAT, SAVE_FILE]
}

// src/core/usecases/phase3OutlinePlanning.ts
export function phase3OutlinePlanning(
  input: Phase3Input
): Phase3Output {
  // 1. 生成全书大纲
  // 2. 逐卷生成卷大纲
  // 3. 逐章生成章大纲（场景级）
  // 4. 规划伏笔埋设和回收点
  // 返回 Effects: [AI_CHAT, SAVE_FILE]
}

// src/core/usecases/phase4ChapterGeneration.ts
export function phase4ChapterGeneration(
  input: Phase4Input
): Phase4Output {
  // 核心循环：
  // 1. 组装上下文
  // 2. 写作Agent生成初稿
  // 3. 提取Agent扫描更新世界状态
  // 4. 九项并行校验
  // 5. 如有问题，修复循环（最多N轮）
  // 6. 风格润色
  // 返回 Effects: [AI_CHAT, SAVE_FILE, LOG]
}

// src/core/usecases/phase5FinalValidation.ts
export function phase5FinalValidation(
  input: Phase5Input
): Phase5Output {
  // 1. 全书一致性扫描
  // 2. 节奏审查
  // 3. 生成质量报告
  // 返回 Effects: [SAVE_FILE]
}
```

### 3.2 Effects：副作用声明

```typescript
// src/core/effects.ts

export type Effect =
  // AI 相关
  | { type: 'AI_CHAT'; payload: { model: 'main' | 'json'; messages: Message[]; temperature?: number } }
  
  // 文件操作
  | { type: 'SAVE_FILE'; payload: { path: string; content: string; encoding?: string } }
  | { type: 'READ_FILE'; payload: { path: string; encoding?: string } }
  | { type: 'ENSURE_DIR'; payload: { path: string } }
  | { type: 'FILE_EXISTS'; payload: { path: string } }
  
  // 日志
  | { type: 'LOG_INFO'; payload: { message: string; context?: Record<string, unknown> } }
  | { type: 'LOG_DEBUG'; payload: { message: string; context?: Record<string, unknown> } }
  | { type: 'LOG_ERROR'; payload: { message: string; error?: Error } }
  | { type: 'SAVE_AI_CONVERSATION'; payload: { logPath: string; conversation: AIConversation } }
  
  // 进度显示
  | { type: 'SHOW_PROGRESS'; payload: { current: number; total: number; message: string } }
  | { type: 'SHOW_MESSAGE'; payload: { type: 'info' | 'success' | 'warning' | 'error'; message: string } }
  ;
```

### 3.3 Domain Models

```typescript
// src/core/models/character.ts

export interface Character {
  id: string;                    // char_001
  name: string;
  aliases: string[];
  gender: '男' | '女' | '其他';
  age: number | string;          // 支持"24岁"或"第一卷开始时24岁"
  
  appearance: {
    height: string;
    build: string;
    distinctiveFeatures: string[];
    typicalClothing: string;
  };
  
  personality: {
    coreTraits: string[];
    weaknesses: string[];
    catchphrases: string[];
    speechStyle: string;
  };
  
  background: {
    origin: string;
    keyExperiences: string[];
  };
  
  motivation: string;
  
  abilities: {
    current: string[];
    potential: string[];
    limits: string;
  };
  
  state: {
    location: string;            // 地点ID或名称
    health: string;
    inventory: string[];
    knownInfo: string[];         // 该角色知道的信息
    unknownInfo: string[];       // 该角色不知道的信息（读者可能知道）
    emotion: string;
    emotionSource: string;
  };
}

// src/core/models/location.ts

export interface Location {
  id: string;                    // loc_001
  name: string;
  type: '城市' | '村镇' | '建筑' | '自然地标' | '其他';
  region: string;
  description: string;
  keyLandmarks: string[];
  
  travelTime: Record<string, string>;  // 到其他地点的时间
  
  socialEnvironment: string;
  currentWeather: string;
}

// src/core/models/outline.ts

export interface NovelOutline {
  title: string;
  theme: string;
  coreQuestion: string;
  emotionalArc: string;
}

export interface VolumeOutline {
  volume: number;
  title: string;
  coreTask: string;
  endingState: string;
  chapters: ChapterOutline[];
}

export interface ChapterOutline {
  volume: number;
  chapter: number;
  title: string;
  function: string;
  
  scenes: Scene[];
  
  emotionalTone: {
    start: string;
    end: string;
  };
  
  hooksToPlant: string[];        // 伏笔ID
  hooksToResolve: string[];      // 伏笔ID
  stateChanges: StateChange[];
}

export interface Scene {
  location: string;              // 地点ID
  characters: string[];          // 角色ID
  events: string;
  reveals: string[];             // 揭示的信息
}

export interface StateChange {
  entityType: 'character' | 'location' | 'world';
  entityId: string;
  property: string;
  newValue: unknown;
  reason: string;
}
```

### 3.4 Ports：接口定义

```typescript
// src/core/ports.ts

export interface AIPort {
  chat(options: ChatOptions): Promise<ChatResponse>;
}

export interface ChatOptions {
  model: 'main' | 'json';
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StoragePort {
  saveFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  listDir(path: string): Promise<string[]>;
}

export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
  saveAIConversation(logPath: string, conversation: AIConversation): Promise<void>;
}

export interface UIPort {
  showProgress(current: number, total: number, message: string): void;
  showMessage(type: 'info' | 'success' | 'warning' | 'error', message: string): void;
}
```

### 3.5 九项校验规则

```typescript
// src/core/rules/validationRules.ts

export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
}

export interface Violation {
  type: ValidationType;
  severity: 'critical' | 'warning';
  message: string;
  location?: string;         // 在章节中的位置
  suggestedFix?: string;     // 建议的修复方案
}

export type ValidationType =
  | 'WORLD_RULE'           // 世界规则校验
  | 'SPACETIME'            // 时空校验
  | 'INFORMATION_LOGIC'    // 信息逻辑校验
  | 'CHARACTER_BEHAVIOR'   // 角色行为校验
  | 'ABILITY'              // 能力校验
  | 'INVENTORY'            // 物品状态校验
  | 'HOOK'                 // 伏笔校验
  | 'BACKGROUND'           // 常识背景校验
  | 'NARRATIVE_LOGIC';     // 叙事逻辑校验

// 每个校验规则的实现
export function validateWorldRules(
  chapter: Chapter,
  worldRules: WorldRule[],
  worldState: WorldState
): ValidationResult;

export function validateSpacetime(
  chapter: Chapter,
  timeline: Timeline,
  characterStates: CharacterState[]
): ValidationResult;

// ... 其他校验函数
```

---

## 4. Bus 层详细设计

### 4.1 Command 定义

```typescript
// src/bus/commands.ts

export type Command =
  | { type: 'INIT_PROJECT'; payload: InitProjectInput }
  | { type: 'TEST_AI_CONNECTION'; payload: TestAIConnectionInput }
  | { type: 'GENERATE_FRAMEWORK'; payload: GenerateFrameworkInput }
  | { type: 'GENERATE_CHAPTERS'; payload: GenerateChaptersInput }
  | { type: 'EXPORT_PROJECT'; payload: ExportProjectInput }
  ;

export interface InitProjectInput {
  dir: string;
  force: boolean;
}

export interface TestAIConnectionInput {
  dir: string;
  model: 'main' | 'json' | 'all';
}

export interface GenerateFrameworkInput {
  dir: string;
  name: string;
  creativeDescription: string;
  volumes?: number;
  chaptersPerVolume?: number;
  wordsPerChapter?: number;
}

export interface GenerateChaptersInput {
  dir: string;
  name: string;
  volume?: number;
  startChapter?: number;
  endChapter?: number;
  specificChapter?: number;
  force: boolean;
}

export interface ExportProjectInput {
  dir: string;
  name: string;
  format: 'markdown' | 'json';
  outputDir: string;
}
```

### 4.2 Dispatcher

```typescript
// src/bus/dispatcher.ts

import { Effect } from '../core/effects';

export interface AppContext {
  ai: AIPort;
  storage: StoragePort;
  logger: LoggerPort;
  ui: UIPort;
  config: Config;
}

export async function dispatch(
  ctx: AppContext,
  cmd: Command
): Promise<unknown> {
  switch (cmd.type) {
    case 'INIT_PROJECT':
      return handleInitProject(ctx, cmd.payload);
    case 'TEST_AI_CONNECTION':
      return handleTestAIConnection(ctx, cmd.payload);
    case 'GENERATE_FRAMEWORK':
      return handleGenerateFramework(ctx, cmd.payload);
    case 'GENERATE_CHAPTERS':
      return handleGenerateChapters(ctx, cmd.payload);
    case 'EXPORT_PROJECT':
      return handleExportProject(ctx, cmd.payload);
    default:
      throw new AppError('UNKNOWN_COMMAND', `未知命令: ${(cmd as Command).type}`);
  }
}

async function handleInitProject(ctx: AppContext, input: InitProjectInput) {
  const output = initProjectUseCase(input);
  await runEffects(ctx, output.effects);
  return output.result;
}

async function handleGenerateChapters(ctx: AppContext, input: GenerateChaptersInput) {
  // 加载项目
  const project = await loadProject(ctx, input.dir, input.name);
  
  // 确定章节范围
  const chaptersToGenerate = calculateChapterRange(project, input);
  
  // 逐章生成
  for (const chapterMeta of chaptersToGenerate) {
    ctx.ui.showProgress(
      chapterMeta.globalIndex,
      project.totalChapters,
      `生成第${chapterMeta.volume}卷第${chapterMeta.chapter}章`
    );
    
    const output = phase4ChapterGeneration({
      project,
      chapterMeta,
      config: ctx.config,
    });
    
    await runEffects(ctx, output.effects);
  }
  
  // 全书校验
  const finalOutput = phase5FinalValidation({ project });
  await runEffects(ctx, finalOutput.effects);
  
  return { generated: chaptersToGenerate.length };
}
```

### 4.3 Effect Runner

```typescript
// src/bus/effectRunner.ts

export async function runEffects(
  ctx: AppContext,
  effects: Effect[]
): Promise<void> {
  for (const effect of effects) {
    await runEffect(ctx, effect);
  }
}

async function runEffect(ctx: AppContext, effect: Effect): Promise<void> {
  switch (effect.type) {
    case 'AI_CHAT': {
      const response = await ctx.ai.chat(effect.payload);
      // 记录AI对话
      await ctx.logger.saveAIConversation(
        generateLogPath(),
        {
          request: effect.payload,
          response,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }
    
    case 'SAVE_FILE':
      await ctx.storage.saveFile(effect.payload.path, effect.payload.content);
      return;
      
    case 'READ_FILE': {
      const content = await ctx.storage.readFile(effect.payload.path);
      // 读取结果需要传递给调用者，这里通过上下文或返回值处理
      return;
    }
    
    case 'ENSURE_DIR':
      await ctx.storage.ensureDir(effect.payload.path);
      return;
      
    case 'LOG_INFO':
      ctx.logger.info(effect.payload.message, effect.payload.context);
      return;
      
    case 'LOG_DEBUG':
      ctx.logger.debug(effect.payload.message, effect.payload.context);
      return;
      
    case 'LOG_ERROR':
      ctx.logger.error(effect.payload.message, effect.payload.error);
      return;
      
    case 'SHOW_PROGRESS':
      ctx.ui.showProgress(
        effect.payload.current,
        effect.payload.total,
        effect.payload.message
      );
      return;
      
    case 'SHOW_MESSAGE':
      ctx.ui.showMessage(effect.payload.type, effect.payload.message);
      return;
      
    default:
      throw new AppError('UNKNOWN_EFFECT', `未知副作用: ${(effect as Effect).type}`);
  }
}
```

---

## 5. Shell 层详细设计

### 5.1 CLI Shell

```typescript
// src/shells/cli/index.ts

import { Command } from 'commander';
import chalk from 'chalk';
import { dispatch } from '../../bus/dispatcher';
import { buildAppContext } from '../contextBuilder';

const program = new Command();

program
  .name('novelagent')
  .description('AI长篇小说自动生成工具')
  .version('1.0.0');

// init 命令
program
  .command('init')
  .description('初始化NovelAgent项目')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-f, --force', '强制覆盖已存在的配置', false)
  .action(async (options) => {
    const ctx = await buildAppContext(options.dir);
    const result = await dispatch(ctx, {
      type: 'INIT_PROJECT',
      payload: { dir: options.dir, force: options.force }
    });
    console.log(chalk.green('✓ 项目初始化成功'));
    console.log(chalk.gray(`配置文件: ${options.dir}/config.yaml`));
  });

// test 命令
program
  .command('test')
  .description('测试AI连接')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-m, --model <type>', '测试的模型', 'all')
  .action(async (options) => {
    const ctx = await buildAppContext(options.dir);
    const result = await dispatch(ctx, {
      type: 'TEST_AI_CONNECTION',
      payload: { dir: options.dir, model: options.model }
    });
    // 显示测试结果
  });

// framework 命令
program
  .command('framework <creativeDescription>')
  .description('生成小说框架')
  .requiredOption('-n, --name <name>', '项目名')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('--volumes <n>', '卷数')
  .option('--chapters-per-volume <n>', '每卷章数')
  .option('--words-per-chapter <n>', '每章字数')
  .action(async (creativeDescription, options) => {
    const ctx = await buildAppContext(options.dir);
    await dispatch(ctx, {
      type: 'GENERATE_FRAMEWORK',
      payload: {
        dir: options.dir,
        name: options.name,
        creativeDescription,
        volumes: options.volumes ? parseInt(options.volumes) : undefined,
        chaptersPerVolume: options.chaptersPerVolume ? parseInt(options.chaptersPerVolume) : undefined,
        wordsPerChapter: options.wordsPerChapter ? parseInt(options.wordsPerChapter) : undefined,
      }
    });
  });

// chapters 命令
program
  .command('chapters <name>')
  .description('生成章节')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-v, --volume <n>', '仅生成指定卷')
  .option('-r, --range <range>', '生成范围，如"5-10"')
  .option('-c, --chapter <n>', '仅生成指定章节')
  .option('--force', '强制重生成已存在的章节', false)
  .action(async (name, options) => {
    const ctx = await buildAppContext(options.dir);
    await dispatch(ctx, {
      type: 'GENERATE_CHAPTERS',
      payload: {
        dir: options.dir,
        name,
        volume: options.volume ? parseInt(options.volume) : undefined,
        startChapter: options.range ? parseInt(options.range.split('-')[0]) : undefined,
        endChapter: options.range ? parseInt(options.range.split('-')[1]) : undefined,
        specificChapter: options.chapter ? parseInt(options.chapter) : undefined,
        force: options.force,
      }
    });
  });

// export 命令
program
  .command('export <name>')
  .description('导出产物')
  .option('-d, --dir <path>', '工作目录', process.cwd())
  .option('-f, --format <format>', '导出格式', 'markdown')
  .option('-o, --output <path>', '输出目录')
  .action(async (name, options) => {
    const ctx = await buildAppContext(options.dir);
    await dispatch(ctx, {
      type: 'EXPORT_PROJECT',
      payload: {
        dir: options.dir,
        name,
        format: options.format,
        outputDir: options.output || `${options.dir}/exports`,
      }
    });
  });

program.parse();
```

### 5.2 TUI Shell

```typescript
// src/shells/tui/index.ts

import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { dispatch } from '../../bus/dispatcher';
import { buildAppContext } from '../contextBuilder';

export async function runTUI() {
  console.log(chalk.blue.bold('\n📚 NovelAgent - AI长篇小说生成工具\n'));
  
  const workDir = await input({
    message: '工作目录',
    default: process.cwd(),
  });
  
  const action = await select({
    message: '选择操作',
    choices: [
      { name: '1. 初始化新项目', value: 'init' },
      { name: '2. 测试AI连接', value: 'test' },
      { name: '3. 生成小说框架', value: 'framework' },
      { name: '4. 生成章节', value: 'chapters' },
      { name: '5. 导出产物', value: 'export' },
      { name: '6. 退出', value: 'exit' },
    ],
  });
  
  if (action === 'exit') return;
  
  const ctx = await buildAppContext(workDir);
  
  switch (action) {
    case 'init':
      await handleInit(ctx, workDir);
      break;
    case 'test':
      await handleTest(ctx, workDir);
      break;
    case 'framework':
      await handleFramework(ctx, workDir);
      break;
    case 'chapters':
      await handleChapters(ctx, workDir);
      break;
    case 'export':
      await handleExport(ctx, workDir);
      break;
  }
}

async function handleFramework(ctx: AppContext, workDir: string) {
  const creativeDescription = await input({
    message: '请输入你的创意描述',
    validate: (val) => val.length >= 10 || '描述至少需要10个字符',
  });
  
  const name = await input({
    message: '项目名',
    validate: (val) => /^[a-zA-Z0-9_-]+$/.test(val) || '只能包含字母、数字、下划线和横线',
  });
  
  await dispatch(ctx, {
    type: 'GENERATE_FRAMEWORK',
    payload: { dir: workDir, name, creativeDescription }
  });
}

// ... 其他处理函数
```

---

## 6. Adapter 层详细设计

### 6.1 AI Adapter

```typescript
// src/adapters/aiAdapter.ts

import { AIPort, ChatOptions, ChatResponse } from '../core/ports';

export interface AIModelConfig {
  provider: 'openai-compatible';
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class OpenAICompatibleAdapter implements AIPort {
  private mainModelConfig: AIModelConfig;
  private jsonModelConfig: AIModelConfig;
  
  constructor(config: {
    mainModel: AIModelConfig;
    jsonModel: AIModelConfig;
  }) {
    this.mainModelConfig = config.mainModel;
    this.jsonModelConfig = config.jsonModel;
  }
  
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const config = options.model === 'main' 
      ? this.mainModelConfig 
      : this.jsonModelConfig;
    
    const temperature = options.temperature ?? config.temperature;
    const maxTokens = options.maxTokens ?? config.maxTokens;
    
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: options.messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI请求失败: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
```

### 6.2 Storage Adapter

```typescript
// src/adapters/storageAdapter.ts

import * as fs from 'fs-extra';
import { StoragePort } from '../core/ports';

export class FileSystemStorageAdapter implements StoragePort {
  async saveFile(path: string, content: string): Promise<void> {
    await fs.ensureFile(path);
    await fs.writeFile(path, content, 'utf-8');
  }
  
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }
  
  async fileExists(path: string): Promise<boolean> {
    return fs.pathExists(path);
  }
  
  async ensureDir(path: string): Promise<void> {
    await fs.ensureDir(path);
  }
  
  async listDir(path: string): Promise<string[]> {
    const exists = await fs.pathExists(path);
    if (!exists) return [];
    return fs.readdir(path);
  }
}
```

### 6.3 Logger Adapter

```typescript
// src/adapters/loggerAdapter.ts

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { LoggerPort, AIConversation } from '../core/ports';

export class FileLoggerAdapter implements LoggerPort {
  private logDir: string;
  private logLevel: 'debug' | 'info' | 'error';
  
  constructor(options: { logDir: string; logLevel: string }) {
    this.logDir = options.logDir;
    this.logLevel = options.logLevel as 'debug' | 'info' | 'error';
    fs.ensureDirSync(this.logDir);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, context);
      console.log(chalk.blue(`[INFO] ${message}`));
    }
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, context);
    }
  }
  
  error(message: string, error?: Error): void {
    this.log('ERROR', message, { error: error?.message, stack: error?.stack });
    console.error(chalk.red(`[ERROR] ${message}`));
    if (error) console.error(chalk.gray(error.stack));
  }
  
  async saveAIConversation(logPath: string, conversation: AIConversation): Promise<void> {
    const fullPath = path.join(this.logDir, logPath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, JSON.stringify(conversation, null, 2), 'utf-8');
  }
  
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
  
  private async log(level: string, message: string, context?: Record<string, unknown>): Promise<void> {
    const logFile = path.join(this.logDir, 'novel-generation.log');
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  }
}
```

---

## 7. 目录结构

```
novelagent/
├── src/
│   ├── core/                      # ★ 纯逻辑层
│   │   ├── index.ts
│   │   ├── models/                # 领域模型
│   │   │   ├── character.ts
│   │   │   ├── location.ts
│   │   │   ├── outline.ts
│   │   │   ├── chapter.ts
│   │   │   └── project.ts
│   │   ├── usecases/              # 五阶段工作流
│   │   │   ├── phase1UnderstandRequirements.ts
│   │   │   ├── phase2WorldBuilding.ts
│   │   │   ├── phase3OutlinePlanning.ts
│   │   │   ├── phase4ChapterGeneration.ts
│   │   │   └── phase5FinalValidation.ts
│   │   ├── rules/                 # 九项校验规则
│   │   │   ├── index.ts
│   │   │   ├── worldRuleValidation.ts
│   │   │   ├── spacetimeValidation.ts
│   │   │   ├── informationValidation.ts
│   │   │   ├── characterValidation.ts
│   │   │   ├── abilityValidation.ts
│   │   │   ├── inventoryValidation.ts
│   │   │   ├── hookValidation.ts
│   │   │   ├── backgroundValidation.ts
│   │   │   └── narrativeValidation.ts
│   │   ├── rag/                   # 上下文组装
│   │   │   ├── contextAssembler.ts
│   │   │   ├── summaryManager.ts
│   │   │   └── types.ts
│   │   ├── effects.ts             # Effect 类型定义
│   │   ├── errors.ts              # 错误类型
│   │   ├── dto.ts                 # 输入/输出类型
│   │   └── ports.ts               # 接口定义
│   │
│   ├── bus/                       # 命令分发层
│   │   ├── index.ts
│   │   ├── commands.ts            # Command 类型
│   │   ├── dispatcher.ts          # dispatch 函数
│   │   └── effectRunner.ts        # Effect 执行器
│   │
│   ├── adapters/                  # 适配器层
│   │   ├── index.ts
│   │   ├── aiAdapter.ts           # AI 适配器
│   │   ├── storageAdapter.ts      # 存储适配器
│   │   └── loggerAdapter.ts       # 日志适配器
│   │
│   ├── shells/                    # 外壳层
│   │   ├── cli/                   # CLI 实现
│   │   │   └── index.ts
│   │   ├── tui/                   # TUI 实现
│   │   │   └── index.ts
│   │   └── contextBuilder.ts      # AppContext 构建器
│   │
│   └── config/                    # 配置相关
│       ├── loader.ts              # 配置文件加载
│       └── schema.ts              # 配置类型定义
│
├── tests/
│   ├── core/                      # Core 单元测试
│   │   ├── usecases/
│   │   ├── models/
│   │   └── rules/
│   ├── bus/                       # Bus 集成测试
│   └── e2e/                       # 端到端测试
│
├── docs/                          # 项目文档
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. 项目数据结构

```
my-novel/                          # 用户工作目录
├── config.yaml                    # 配置文件
│
├── my-novel-project/              # 具体小说项目
│   ├── project.json               # 项目元数据
│   │
│   ├── world/                     # 世界设定
│   │   ├── world.yaml             # 世界观总览
│   │   ├── characters.yaml        # 角色档案
│   │   ├── locations.yaml         # 地点档案
│   │   ├── rules.yaml             # 世界规则
│   │   ├── timeline.yaml          # 时间线
│   │   ├── relationships.yaml     # 关系图谱
│   │   └── hooks.yaml             # 伏笔追踪
│   │
│   ├── outline/                   # 大纲
│   │   ├── novel.yaml             # 全书大纲
│   │   ├── volume-1.yaml          # 第一卷大纲
│   │   ├── volume-2.yaml
│   │   └── chapters/              # 章级大纲
│   │       ├── vol-1-ch-001.yaml
│   │       ├── vol-1-ch-002.yaml
│   │       └── ...
│   │
│   ├── chapters/                  # 章节正文
│   │   ├── vol-1-ch-001.md
│   │   ├── vol-1-ch-002.md
│   │   └── ...
│   │
│   ├── logs/                      # 生成日志
│   │   ├── novel-generation.log
│   │   ├── ai-conversations/
│   │   │   ├── phase1-requirements.json
│   │   │   ├── phase2-world-building.json
│   │   │   ├── phase3-outline/
│   │   │   │   ├── novel.json
│   │   │   │   └── volumes/
│   │   │   └── phase4-chapters/
│   │   │       ├── vol-1-ch-001/
│   │   │       │   ├── prompt.json
│   │   │       │   ├── response.json
│   │   │       │   ├── validation-1.json
│   │   │       │   ├── fix-round-1.json
│   │   │       │   └── ...
│   │   └── validation-reports/
│   │
│   └── exports/                   # 导出产物
│       ├── novel.md               # 完整小说
│       ├── requirements.md        # 需求文档
│       ├── world.md               # 世界观文档
│       ├── characters.md          # 角色档案
│       ├── outline.md             # 大纲文档
│       ├── timeline.md            # 时间线
│       └── report.md              # 生成报告
```

---

## 9. 错误处理架构

### 9.1 错误类型定义

```typescript
// src/core/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // 配置错误
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // AI 错误
  AI_CONNECTION_FAILED: 'AI_CONNECTION_FAILED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  
  // 项目错误
  PROJECT_EXISTS: 'PROJECT_EXISTS',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  
  // 生成错误
  GENERATION_FAILED: 'GENERATION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FIX_FAILED: 'FIX_FAILED',
  
  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  
  // 未知错误
  UNKNOWN: 'UNKNOWN',
} as const;
```

### 9.2 错误响应格式

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "章节校验未通过，且修复次数已达上限",
    "details": {
      "chapter": "vol-1-ch-005",
      "violations": [
        { "type": "WORLD_RULE", "message": "角色在魔力耗尽后使用了魔法" }
      ],
      "fixRounds": 3
    }
  }
}
```

---

## 10. 配置规范

### 10.1 config.yaml

```yaml
# AI 模型配置
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: sk-xxx
    model: qwen3.5-flash
    temperature: 0.7
    maxTokens: 32768
  
  jsonModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: sk-xxx
    model: qwen3.5-flash
    temperature: 0.3
    maxTokens: 32768

# 小说生成默认参数
novel:
  defaultVolumes: 3
  defaultChaptersPerVolume: 12
  defaultWordsPerChapter: 3000
  fixMaxRounds: 3

# 日志配置
logging:
  level: info
  saveAiConversation: true
```

---

## 11. 安全考虑

1. **API Key保护**：存储在用户本地配置文件，不上传到任何服务器
2. **日志脱敏**：AI对话日志中自动脱敏API Key
3. **文件权限**：创建的文件默认只对用户可读写
4. **路径安全**：禁止访问工作目录之外的文件（路径遍历防护）
