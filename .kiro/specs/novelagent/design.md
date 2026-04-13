# Design Document - NovelAgent

## Overview

NovelAgent是一个AI驱动的长篇小说自动生成CLI工具,采用Core-Shell三层架构设计。系统通过五阶段工作流(需求理解→世界构建→大纲规划→逐章生成→全书校验)和九项校验规则,实现高质量长篇小说的自动化生成,解决AI写作中的一致性问题。

### 核心设计目标

1. **架构清晰性**: 严格的Core-Shell分层,业务逻辑与框架完全分离
2. **可测试性**: Core层纯函数设计,90%测试覆盖率集中在业务逻辑
3. **可靠性**: 断点续传、自动重试、强制修复机制确保生成质量
4. **可扩展性**: Port接口设计支持多种AI服务商和存储后端

### 技术栈

- **语言**: TypeScript 5.0+ (类型安全)
- **运行时**: Node.js 20+ (原生fetch支持)
- **CLI框架**: Commander.js 13.x
- **TUI框架**: @inquirer/prompts 7.x
- **类型校验**: Zod 4.x (运行时类型安全)
- **文件操作**: fs-extra 11.x
- **测试框架**: Vitest 4.x

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│  SHELLS (轻量适配层)                                     │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ CLI Shell        │  │ TUI Shell        │            │
│  │ (Commander.js)   │  │ (@inquirer)      │            │
│  └──────────────────┘  └──────────────────┘            │
└────────────────────┬────────────────────────────────────┘
                     │ Command { type, payload }
                     ▼
┌─────────────────────────────────────────────────────────┐
│  COMMAND BUS (网关层)                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Dispatcher: dispatch(cmd) → use case → effects   │  │
│  │ Effect Runner: 执行副作用声明                     │  │
│  │ Workflow Orchestrator: 五阶段编排                │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ fn(Input) → Result<Output, Error>
                     ▼
┌─────────────────────────────────────────────────────────┐
│  CORE (纯逻辑层)                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Use Cases    │ │ Domain       │ │ Validation   │   │
│  │ - Phase 1-5  │ │ Models       │ │ Rules (9项)  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ RAG Context  │ │ Effects      │ │ Ports        │   │
│  │ Assembler    │ │ (声明)       │ │ (接口定义)   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ Port Interfaces
                     ▼
┌─────────────────────────────────────────────────────────┐
│  ADAPTERS (适配器层)                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ AI Adapter   │ │ Storage      │ │ Logger       │   │
│  │ (OpenAI API) │ │ Adapter      │ │ Adapter      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 架构分层职责

| 层级 | 职责 | 依赖限制 | 测试策略 |
|------|------|----------|----------|
| **Shell** | 命令解析、参数验证、输出格式化 | Bus + CLI/TUI框架 | 冒烟测试 (~2%) |
| **Bus** | 命令分发、副作用执行、工作流编排 | Core + Adapter接口 | Mock集成测试 (~8%) |
| **Core** | 全部业务逻辑、领域模型、校验规则 | 仅Zod、chalk | 单元测试 (~90%) |
| **Adapter** | 外部系统集成(AI、文件、日志) | Core Ports | 集成测试 |

### 架构约束(铁律)

1. **Core层禁止导入框架**: 不能有commander、inquirer等框架依赖
2. **Use Case禁止执行I/O**: 只返回Effect声明,由Bus层统一执行
3. **Shell处理器限制10行**: 只做解析→构建Command→调用dispatch→格式化输出
4. **Port在Core定义**: 接口定义在Core层,实现在Adapter层

### Effect模式设计

Effect模式是本系统的核心设计模式,实现业务逻辑与副作用的完全分离:

```typescript
// Core层: 声明需要什么副作用
function generateChapter(input: ChapterInput): ChapterOutput {
  const effects: Effect[] = [
    { type: 'AI_CHAT', payload: { model: 'main', messages: [...] } },
    { type: 'SAVE_FILE', payload: { path: '...', content: '...' } },
    { type: 'LOG_INFO', payload: { message: '章节生成完成' } }
  ];
  return { result: chapter, effects };
}

// Bus层: 执行副作用
async function runEffects(ctx: AppContext, effects: Effect[]) {
  for (const effect of effects) {
    await runEffect(ctx, effect);
  }
}
```

**优势**:
- Core层可以纯函数测试,无需mock
- 副作用执行逻辑集中管理
- 易于添加日志、重试、监控等横切关注点

## Components and Interfaces

### Core层组件

#### 1. Use Cases (五阶段工作流)

**Phase 1: 需求理解**
```typescript
interface Phase1Input {
  creativeDescription: string;
  projectName: string;
  config: GenerationConfig;
}

interface Phase1Output {
  requirements: Requirements;
  effects: Effect[];
}

function phase1UnderstandRequirements(input: Phase1Input): Phase1Output
```

**职责**:
- 解析用户创意描述
- 调用Main Model生成结构化需求
- 生成requirements.md文件

**Phase 2: 世界构建**
```typescript
interface Phase2Input {
  requirements: Requirements;
  config: GenerationConfig;
}

interface Phase2Output {
  worldState: WorldState;
  characters: Character[];
  locations: Location[];
  worldRules: WorldRule[];
  effects: Effect[];
}

function phase2WorldBuilding(input: Phase2Input): Phase2Output
```

**职责**:
- 生成世界观设定
- 生成角色档案(至少5个核心角色)
- 生成地点档案
- 生成世界规则体系
- 初始化时间线

**Phase 3: 大纲规划**
```typescript
interface Phase3Input {
  requirements: Requirements;
  worldState: WorldState;
  config: GenerationConfig;
}

interface Phase3Output {
  novelOutline: NovelOutline;
  volumeOutlines: VolumeOutline[];
  chapterOutlines: ChapterOutline[];
  effects: Effect[];
}

function phase3OutlinePlanning(input: Phase3Input): Phase3Output
```

**职责**:
- 生成全书大纲(主题、核心问题、情感弧线)
- 生成卷大纲(每卷核心任务、结束状态)
- 生成章大纲(场景级、伏笔规划、状态变化)

**Phase 4: 逐章生成**
```typescript
interface Phase4Input {
  chapterMeta: ChapterMeta;
  project: Project;
  config: GenerationConfig;
}

interface Phase4Output {
  chapter: Chapter;
  updatedWorldState: WorldState;
  validationResults: ValidationResult[];
  fixRounds: number;
  effects: Effect[];
}

function phase4ChapterGeneration(input: Phase4Input): Phase4Output
```

**职责** (核心循环):
1. 组装上下文(RAG)
2. 调用Main Model生成初稿
3. 调用JSON Model提取状态变化
4. 并行执行九项校验
5. 如有违规,进入修复循环(最多N轮)
6. 风格润色
7. 保存章节和日志

**Phase 5: 全书校验**
```typescript
interface Phase5Input {
  project: Project;
}

interface Phase5Output {
  report: QualityReport;
  effects: Effect[];
}

function phase5FinalValidation(input: Phase5Input): Phase5Output
```

**职责**:
- 全书一致性扫描
- 节奏审查
- 生成质量报告(统计、错误记录、AI调用统计)

#### 2. Validation Rules (九项校验)

```typescript
interface ValidationRule {
  validate(
    chapter: Chapter,
    context: ValidationContext
  ): ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  violations: Violation[];
}

interface Violation {
  type: ValidationType;
  severity: 'critical' | 'warning';
  message: string;
  location?: string;
  suggestedFix?: string;
}
```

**九项校验规则**:

1. **世界规则校验** (`validateWorldRules`)
   - 检查是否违反已设定的世界规则
   - 例如: 魔法系统限制、物理法则、社会规则

2. **时空校验** (`validateSpacetime`)
   - 检查角色能否在该时间出现在该地点
   - 基于时间线和角色移动速度计算

3. **信息逻辑校验** (`validateInformationLogic`)
   - 检查角色是否使用了不该知道的信息
   - 基于角色的knownInfo和unknownInfo字段

4. **角色行为校验** (`validateCharacterBehavior`)
   - 检查行为是否符合性格档案和当前动机
   - 基于角色的personality和motivation字段

5. **能力校验** (`validateAbility`)
   - 检查展示的能力是否在能力范围内
   - 基于角色的abilities字段

6. **物品状态校验** (`validateInventory`)
   - 检查使用的物品是否确实持有
   - 基于角色的inventory字段

7. **伏笔校验** (`validateHooks`)
   - 检查计划埋设/回收的伏笔是否完成
   - 基于章大纲的hooksToPlant和hooksToResolve

8. **常识背景校验** (`validateBackground`)
   - 检查是否出现与世界背景不符的事物
   - 基于世界观设定和时代背景

9. **叙事逻辑校验** (`validateNarrativeLogic`)
   - 检查大纲功能是否完成
   - 检查因果链是否清晰

**并行执行策略**:
```typescript
async function runValidations(
  chapter: Chapter,
  context: ValidationContext
): Promise<ValidationResult[]> {
  const validationFunctions = [
    validateWorldRules,
    validateSpacetime,
    validateInformationLogic,
    validateCharacterBehavior,
    validateAbility,
    validateInventory,
    validateHooks,
    validateBackground,
    validateNarrativeLogic
  ];
  
  return Promise.all(
    validationFunctions.map(fn => fn(chapter, context))
  );
}
```

#### 3. RAG Context Assembler

```typescript
interface ContextAssemblerInput {
  chapterMeta: ChapterMeta;
  project: Project;
}

interface AssembledContext {
  chapterOutline: ChapterOutline;
  volumeOutline: VolumeOutline;
  novelOutline: NovelOutline;
  relevantCharacters: Character[];
  relevantLocations: Location[];
  recentChapters: Chapter[];  // 前3章完整内容
  chapterSummaries: ChapterSummary[];  // 第4-10章摘要
  worldState: WorldState;
  relevantHooks: Hook[];
  estimatedTokens: number;
}

function assembleContext(input: ContextAssemblerInput): AssembledContext
```

**组装策略**:

1. **优先级排序** (从高到低):
   - 章级大纲 (必需)
   - 角色档案 (当前章节涉及的角色)
   - 前3章完整内容
   - 卷大纲
   - 当前世界状态
   - 前文摘要(第4-10章)
   - 全书大纲

2. **裁剪机制**:
   - 计算组装后的token数
   - 如果超过模型上下文窗口的80%,按优先级从低到高裁剪
   - 章级大纲和角色档案不可裁剪

3. **性能要求**:
   - 组装时间 < 1秒
   - 使用缓存避免重复读取文件

#### 4. Summary Manager

```typescript
interface SummaryManagerInput {
  chapter: Chapter;
  config: SummaryConfig;
}

interface ChapterSummary {
  chapterId: string;
  keyEvents: string[];
  characterActions: Record<string, string[]>;
  stateChanges: StateChange[];
  wordCount: number;
  summaryLength: number;
}

function generateSummary(input: SummaryManagerInput): ChapterSummary
```

**摘要生成策略**:
- 当章节序号 > 3时生成摘要
- 调用Main Model提取关键信息
- 摘要长度为原文的10%-20%
- 保存到`chapters/summaries/{章节ID}-summary.md`

**滑动窗口策略**:
- 前3章: 完整内容
- 第4-10章: 摘要
- 第11章以后: 仅包含第(当前-10)到(当前-4)章的摘要

### Port接口定义

#### AIPort

```typescript
interface AIPort {
  chat(options: ChatOptions): Promise<ChatResponse>;
}

interface ChatOptions {
  model: 'main' | 'json';
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

**实现要求**:
- 支持OpenAI兼容API格式
- 自动重试机制(指数退避)
- 超时设置(30秒)
- 错误分类(网络错误、API错误、限流错误)

#### StoragePort

```typescript
interface StoragePort {
  saveFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  listDir(path: string): Promise<string[]>;
}
```

**实现要求**:
- 使用UTF-8编码
- 原子写入(避免文件损坏)
- 路径安全检查(防止路径遍历攻击)

#### LoggerPort

```typescript
interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
  saveAIConversation(logPath: string, conversation: AIConversation): Promise<void>;
}
```

**实现要求**:
- 支持日志级别过滤
- 自动脱敏(API Key等敏感信息)
- 结构化日志格式(JSON)

#### UIPort

```typescript
interface UIPort {
  showProgress(current: number, total: number, message: string): void;
  showMessage(type: 'info' | 'success' | 'warning' | 'error', message: string): void;
}
```

### Command Bus组件

#### Command定义

```typescript
type Command =
  | { type: 'INIT_PROJECT'; payload: InitProjectInput }
  | { type: 'TEST_AI_CONNECTION'; payload: TestAIConnectionInput }
  | { type: 'GENERATE_FRAMEWORK'; payload: GenerateFrameworkInput }
  | { type: 'GENERATE_CHAPTERS'; payload: GenerateChaptersInput }
  | { type: 'EXPORT_PROJECT'; payload: ExportProjectInput };
```

#### Dispatcher

```typescript
interface AppContext {
  ai: AIPort;
  storage: StoragePort;
  logger: LoggerPort;
  ui: UIPort;
  config: Config;
}

async function dispatch(
  ctx: AppContext,
  cmd: Command
): Promise<unknown>
```

**职责**:
- 路由Command到对应的handler
- 调用Use Case函数
- 执行返回的Effects
- 错误处理和日志记录

#### Effect Runner

```typescript
async function runEffects(
  ctx: AppContext,
  effects: Effect[]
): Promise<void>
```

**职责**:
- 顺序执行Effect列表
- 根据Effect类型调用对应的Adapter
- 记录执行日志
- 错误处理和重试

## Data Models

### Character (角色模型)

```typescript
interface Character {
  id: string;                    // 唯一标识, 如 "char_001"
  name: string;                  // 角色名
  aliases: string[];             // 别名、称号
  gender: '男' | '女' | '其他';
  age: number | string;          // 支持 "24岁" 或 "第一卷开始时24岁"
  
  appearance: {
    height: string;              // 身高描述
    build: string;               // 体型描述
    distinctiveFeatures: string[]; // 显著特征
    typicalClothing: string;     // 典型着装
  };
  
  personality: {
    coreTraits: string[];        // 核心性格特质
    weaknesses: string[];        // 性格弱点
    catchphrases: string[];      // 口头禅
    speechStyle: string;         // 说话风格
  };
  
  background: {
    origin: string;              // 出身背景
    keyExperiences: string[];    // 关键经历
  };
  
  motivation: string;            // 当前动机
  
  abilities: {
    current: string[];           // 当前能力
    potential: string[];         // 潜在能力
    limits: string;              // 能力限制
  };
  
  state: {
    location: string;            // 当前位置(地点ID)
    health: string;              // 健康状态
    inventory: string[];         // 持有物品
    knownInfo: string[];         // 已知信息
    unknownInfo: string[];       // 未知信息(读者可能知道)
    emotion: string;             // 当前情绪
    emotionSource: string;       // 情绪来源
  };
}
```

**设计说明**:
- `state`字段会随章节生成动态更新
- `knownInfo`和`unknownInfo`用于信息逻辑校验
- `abilities.limits`明确能力边界,防止能力膨胀

### Location (地点模型)

```typescript
interface Location {
  id: string;                    // 唯一标识, 如 "loc_001"
  name: string;                  // 地点名称
  type: '城市' | '村镇' | '建筑' | '自然地标' | '其他';
  region: string;                // 所属区域
  description: string;           // 详细描述
  keyLandmarks: string[];        // 关键地标
  
  travelTime: Record<string, string>;  // 到其他地点的旅行时间
  
  socialEnvironment: string;     // 社会环境
  currentWeather: string;        // 当前天气
}
```

**设计说明**:
- `travelTime`用于时空校验
- `currentWeather`可随时间变化

### Outline (大纲模型)

```typescript
interface NovelOutline {
  title: string;                 // 小说标题
  theme: string;                 // 主题
  coreQuestion: string;          // 核心问题
  emotionalArc: string;          // 情感弧线
}

interface VolumeOutline {
  volume: number;                // 卷号
  title: string;                 // 卷标题
  coreTask: string;              // 核心任务
  endingState: string;           // 结束状态
  chapters: ChapterOutline[];    // 章节列表
}

interface ChapterOutline {
  volume: number;                // 卷号
  chapter: number;               // 章号
  title: string;                 // 章标题
  function: string;              // 章节功能(推进情节/角色发展/世界展示)
  
  scenes: Scene[];               // 场景列表
  
  emotionalTone: {
    start: string;               // 开始情绪
    end: string;                 // 结束情绪
  };
  
  hooksToPlant: string[];        // 需要埋设的伏笔ID
  hooksToResolve: string[];      // 需要回收的伏笔ID
  stateChanges: StateChange[];   // 预期状态变化
}

interface Scene {
  location: string;              // 地点ID
  characters: string[];          // 角色ID列表
  events: string;                // 事件描述
  reveals: string[];             // 揭示的信息
}

interface StateChange {
  entityType: 'character' | 'location' | 'world';
  entityId: string;              // 实体ID
  property: string;              // 属性名
  newValue: unknown;             // 新值
  reason: string;                // 变化原因
}
```

**设计说明**:
- 三层大纲结构: Novel → Volume → Chapter
- `stateChanges`用于校验状态更新是否符合预期
- `hooksToPlant`和`hooksToResolve`用于伏笔校验

### WorldState (世界状态数据库)

```typescript
interface WorldState {
  characters: Record<string, CharacterState>;
  locations: Record<string, LocationState>;
  timeline: TimelineEvent[];
  hooks: Record<string, Hook>;
  worldRules: WorldRule[];
  lastUpdatedChapter: string;
}

interface CharacterState {
  characterId: string;
  location: string;
  health: string;
  inventory: string[];
  knownInfo: string[];
  unknownInfo: string[];
  emotion: string;
  emotionSource: string;
}

interface LocationState {
  locationId: string;
  currentWeather: string;
  presentCharacters: string[];
  recentEvents: string[];
}

interface TimelineEvent {
  timestamp: string;             // 故事内时间
  event: string;                 // 事件描述
  involvedCharacters: string[];  // 涉及角色
  location: string;              // 发生地点
}

interface Hook {
  id: string;                    // 伏笔ID
  description: string;           // 伏笔描述
  plantedAt: string;             // 埋设章节
  status: 'planted' | 'resolved' | 'abandoned';
  resolvedAt?: string;           // 回收章节
}

interface WorldRule {
  id: string;                    // 规则ID
  category: string;              // 规则类别(魔法/物理/社会等)
  description: string;           // 规则描述
  constraints: string[];         // 约束条件
}
```

**设计说明**:
- WorldState是系统的核心数据结构,记录所有动态状态
- 每章生成后由JSON Model提取状态变化并更新
- 所有校验规则都依赖WorldState

### Project (项目元数据)

```typescript
interface Project {
  projectName: string;
  createdAt: string;             // ISO 8601格式
  updatedAt: string;
  version: string;               // NovelAgent版本号
  
  config: {
    volumes: number;
    chaptersPerVolume: number;
    wordsPerChapter: number;
  };
  
  progress: {
    currentPhase: 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'completed';
    completedChapters: number;
    totalChapters: number;
  };
  
  chapters: ChapterMetadata[];
  
  statistics: {
    totalWords: number;
    totalAICalls: number;
    totalTokens: number;
    totalFixRounds: number;
  };
  
  status: 'draft' | 'generating' | 'completed' | 'failed';
}

interface ChapterMetadata {
  volume: number;
  chapter: number;
  title: string;
  wordCount: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generatedAt?: string;
  fixRounds?: number;
}
```

**设计说明**:
- 保存为`project.json`
- 支持断点续传(通过`progress`字段)
- 记录详细统计信息

### Requirements (需求文档)

```typescript
interface Requirements {
  novelType: string;             // 小说类型
  targetAudience: {
    ageRange: string;
    readingPreferences: string[];
  };
  coreConflict: {
    mainContradiction: string;
    opposingSides: string[];
  };
  theme: string;                 // 主题
  emotionalTone: string;         // 情感基调
  storyBackground: {
    era: string;
    region: string;
    socialEnvironment: string;
  };
  narrativePerspective: string;  // 叙事视角
  expectedLength: {
    totalWords: number;
    chapters: number;
  };
  uniqueSellingPoints: string[]; // 核心卖点
  
  metadata: {
    generatedAt: string;
    novelAgentVersion: string;
  };
}
```

**设计说明**:
- Phase 1生成,保存为`requirements.md` (YAML格式)
- 指导后续所有阶段的生成

### Config (配置文件)

```typescript
interface Config {
  ai: {
    mainModel: AIModelConfig;
    jsonModel: AIModelConfig;
  };
  
  generation: {
    volumes: number;
    chaptersPerVolume: number;
    wordsPerChapter: number;
    maxFixRounds: number;
  };
  
  logging: {
    logLevel: 'debug' | 'info' | 'error';
    logDir: string;
  };
  
  summary: {
    summaryLengthRatio: number;  // 摘要长度比例 (0.1-0.2)
  };
}

interface AIModelConfig {
  provider: 'openai-compatible';
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
```

**设计说明**:
- 保存为`config.yaml`
- CLI参数可覆盖配置文件值
- API Key通过环境变量或配置文件提供

## Error Handling

### 错误类型定义

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const ErrorCodes = {
  // 配置错误
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // AI错误
  AI_CONNECTION_FAILED: 'AI_CONNECTION_FAILED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  
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
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  
  // 未知错误
  UNKNOWN: 'UNKNOWN',
} as const;
```

### 错误传播机制

**Core层**: 抛出AppError,包含错误码和详细信息
```typescript
if (!config) {
  throw new AppError(
    'CONFIG_NOT_FOUND',
    '配置文件不存在',
    { path: configPath }
  );
}
```

**Bus层**: 捕获错误,记录日志,转换为用户友好的消息
```typescript
try {
  await dispatch(ctx, command);
} catch (error) {
  if (error instanceof AppError) {
    ctx.logger.error(error.message, error);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }
  throw error;
}
```

**Shell层**: 格式化错误输出,显示给用户
```typescript
if (!result.success) {
  console.error(chalk.red(`✗ ${result.error.message}`));
  if (result.error.code === 'CONFIG_NOT_FOUND') {
    console.log(chalk.gray('提示: 请先运行 novelagent init 初始化项目'));
  }
  process.exit(1);
}
```

### 错误恢复策略

#### 1. AI请求错误

**网络错误/超时**: 指数退避重试
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}
```

**API限流**: 等待并重试
```typescript
if (error.code === 'AI_RATE_LIMITED') {
  const retryAfter = error.details?.retryAfter || 60;
  ctx.logger.info(`API限流,等待${retryAfter}秒后重试`);
  await sleep(retryAfter * 1000);
  return retry();
}
```

**响应格式错误**: 使用jsonrepair修复
```typescript
try {
  return JSON.parse(response);
} catch (error) {
  const repaired = jsonrepair(response);
  return JSON.parse(repaired);
}
```

#### 2. 文件操作错误

**权限错误**: 提示用户检查权限
```typescript
if (error.code === 'EACCES') {
  throw new AppError(
    'FILE_ACCESS_DENIED',
    `无法写入文件: ${path}`,
    { path, suggestion: '请检查文件权限' }
  );
}
```

**磁盘空间不足**: 提示用户清理空间
```typescript
if (error.code === 'ENOSPC') {
  throw new AppError(
    'FILE_WRITE_FAILED',
    '磁盘空间不足',
    { suggestion: '请清理磁盘空间后重试' }
  );
}
```

#### 3. 校验失败

**修复循环**: 最多N轮,失败后记录并继续
```typescript
let fixRounds = 0;
while (fixRounds < maxFixRounds) {
  const validationResults = await runValidations(chapter, context);
  if (validationResults.every(r => r.passed)) break;
  
  chapter = await fixChapter(chapter, validationResults);
  fixRounds++;
}

if (fixRounds === maxFixRounds) {
  ctx.logger.error('修复失败,已达最大轮次', {
    chapter: chapterMeta.id,
    violations: validationResults.flatMap(r => r.violations)
  });
  // 继续下一章,不终止整个流程
}
```

#### 4. 断点续传

**进度保存**: 每章完成后立即更新project.json
```typescript
async function saveProgress(project: Project) {
  project.updatedAt = new Date().toISOString();
  await ctx.storage.saveFile(
    `${project.path}/project.json`,
    JSON.stringify(project, null, 2)
  );
}
```

**恢复生成**: 检查已完成章节,从中断处继续
```typescript
function calculateChapterRange(project: Project): ChapterMeta[] {
  const completed = project.chapters
    .filter(c => c.status === 'completed')
    .map(c => c.chapter);
  
  return project.chapters
    .filter(c => !completed.includes(c.chapter))
    .sort((a, b) => a.chapter - b.chapter);
}
```

### 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface SuccessResponse<T> {
  success: true;
  data: T;
}

type Response<T> = SuccessResponse<T> | ErrorResponse;
```

## Testing Strategy

### 测试分层策略

NovelAgent采用Core-Shell架构,测试策略与架构分层对应:

| 层级 | 测试类型 | 覆盖率目标 | 测试重点 |
|------|---------|-----------|---------|
| **Core** | 单元测试 | 90% | 业务逻辑、领域模型、校验规则 |
| **Bus** | 集成测试 | 80% | 命令分发、Effect执行、工作流编排 |
| **Adapter** | 集成测试 | 70% | 外部系统集成 |
| **Shell** | 冒烟测试 | 50% | 命令解析、输出格式化 |

### Core层测试

**Use Case测试**: 纯函数测试,无需mock
```typescript
describe('phase1UnderstandRequirements', () => {
  it('应该从创意描述生成结构化需求', () => {
    const input: Phase1Input = {
      creativeDescription: '一个关于时间旅行的科幻故事',
      projectName: 'time-travel',
      config: defaultConfig
    };
    
    const output = phase1UnderstandRequirements(input);
    
    expect(output.requirements.novelType).toBe('科幻');
    expect(output.effects).toContainEqual({
      type: 'AI_CHAT',
      payload: expect.objectContaining({
        model: 'main'
      })
    });
  });
});
```

**Validation Rules测试**: 测试各种违规场景
```typescript
describe('validateSpacetime', () => {
  it('应该检测角色无法在该时间到达该地点', () => {
    const chapter: Chapter = {
      content: '张三出现在北京...',
      // ...
    };
    
    const context: ValidationContext = {
      timeline: [
        { timestamp: '第1天上午', event: '张三在上海', location: 'loc_shanghai' }
      ],
      worldState: {
        characters: {
          'char_zhangsan': { location: 'loc_shanghai', ... }
        }
      }
    };
    
    const result = validateSpacetime(chapter, context);
    
    expect(result.passed).toBe(false);
    expect(result.violations[0].type).toBe('SPACETIME');
    expect(result.violations[0].message).toContain('无法在该时间到达');
  });
});
```

**RAG Context Assembler测试**: 测试优先级和裁剪
```typescript
describe('assembleContext', () => {
  it('应该按优先级组装上下文', () => {
    const input: ContextAssemblerInput = {
      chapterMeta: { volume: 1, chapter: 5 },
      project: mockProject
    };
    
    const context = assembleContext(input);
    
    expect(context.chapterOutline).toBeDefined();
    expect(context.relevantCharacters.length).toBeGreaterThan(0);
    expect(context.recentChapters.length).toBeLessThanOrEqual(3);
  });
  
  it('应该在超过token限制时裁剪低优先级内容', () => {
    const input: ContextAssemblerInput = {
      chapterMeta: { volume: 1, chapter: 20 },
      project: largeProject
    };
    
    const context = assembleContext(input);
    
    expect(context.estimatedTokens).toBeLessThan(maxTokens * 0.8);
    expect(context.chapterOutline).toBeDefined(); // 不可裁剪
  });
});
```

### Bus层测试

**Dispatcher测试**: 使用mock adapter
```typescript
describe('dispatch', () => {
  it('应该正确分发INIT_PROJECT命令', async () => {
    const mockStorage = {
      saveFile: vi.fn(),
      ensureDir: vi.fn(),
      // ...
    };
    
    const ctx: AppContext = {
      storage: mockStorage,
      // ...
    };
    
    await dispatch(ctx, {
      type: 'INIT_PROJECT',
      payload: { dir: '/test', force: false }
    });
    
    expect(mockStorage.saveFile).toHaveBeenCalledWith(
      '/test/config.yaml',
      expect.any(String)
    );
  });
});
```

**Effect Runner测试**: 测试副作用执行
```typescript
describe('runEffects', () => {
  it('应该顺序执行所有effects', async () => {
    const mockAI = { chat: vi.fn().mockResolvedValue({ content: 'test' }) };
    const mockStorage = { saveFile: vi.fn() };
    
    const ctx: AppContext = {
      ai: mockAI,
      storage: mockStorage,
      // ...
    };
    
    const effects: Effect[] = [
      { type: 'AI_CHAT', payload: { model: 'main', messages: [] } },
      { type: 'SAVE_FILE', payload: { path: 'test.md', content: 'test' } }
    ];
    
    await runEffects(ctx, effects);
    
    expect(mockAI.chat).toHaveBeenCalled();
    expect(mockStorage.saveFile).toHaveBeenCalled();
  });
});
```

### Adapter层测试

**AI Adapter测试**: 测试真实API调用(可选)
```typescript
describe('OpenAICompatibleAdapter', () => {
  it('应该成功调用AI API', async () => {
    const adapter = new OpenAICompatibleAdapter({
      mainModel: testConfig.mainModel,
      jsonModel: testConfig.jsonModel
    });
    
    const response = await adapter.chat({
      model: 'main',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    
    expect(response.content).toBeDefined();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });
  
  it('应该在网络错误时重试', async () => {
    // 使用nock模拟网络错误
    nock('https://api.example.com')
      .post('/chat/completions')
      .times(2)
      .replyWithError('Network error')
      .post('/chat/completions')
      .reply(200, mockResponse);
    
    const response = await adapter.chat(options);
    
    expect(response).toBeDefined();
  });
});
```

**Storage Adapter测试**: 测试文件操作
```typescript
describe('FileSystemStorageAdapter', () => {
  it('应该保存文件', async () => {
    const adapter = new FileSystemStorageAdapter();
    const testPath = '/tmp/test.txt';
    
    await adapter.saveFile(testPath, 'test content');
    
    const content = await adapter.readFile(testPath);
    expect(content).toBe('test content');
  });
  
  it('应该防止路径遍历攻击', async () => {
    const adapter = new FileSystemStorageAdapter();
    
    await expect(
      adapter.saveFile('../../../etc/passwd', 'malicious')
    ).rejects.toThrow('Invalid path');
  });
});
```

### Shell层测试

**CLI测试**: 冒烟测试
```typescript
describe('CLI', () => {
  it('应该解析init命令', async () => {
    const result = await runCLI(['init', '--dir', '/test']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('项目初始化成功');
  });
});
```

### 端到端测试

**完整工作流测试**: 测试从init到export的完整流程
```typescript
describe('E2E: 完整小说生成流程', () => {
  it('应该成功生成一部小说', async () => {
    const testDir = '/tmp/novelagent-e2e-test';
    
    // 1. 初始化
    await runCLI(['init', '--dir', testDir]);
    
    // 2. 生成框架
    await runCLI([
      'framework',
      '一个关于魔法学院的故事',
      '--name', 'magic-school',
      '--dir', testDir,
      '--volumes', '1',
      '--chapters-per-volume', '3'
    ]);
    
    // 3. 生成章节
    await runCLI([
      'chapters',
      'magic-school',
      '--dir', testDir
    ]);
    
    // 4. 导出
    await runCLI([
      'export',
      'magic-school',
      '--dir', testDir
    ]);
    
    // 验证
    const projectPath = `${testDir}/magic-school`;
    expect(await fs.pathExists(`${projectPath}/project.json`)).toBe(true);
    expect(await fs.pathExists(`${projectPath}/chapters/vol-1-ch-001.md`)).toBe(true);
    expect(await fs.pathExists(`${projectPath}/exports/novel.md`)).toBe(true);
  }, 300000); // 5分钟超时
});
```

### 测试工具和配置

**Vitest配置**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**'
      ]
    },
    testTimeout: 30000
  }
});
```

**Mock工具**:
- `vi.fn()`: 函数mock
- `vi.spyOn()`: 监听函数调用
- `nock`: HTTP请求mock

### 测试数据管理

**Fixture数据**: 使用固定的测试数据
```typescript
// tests/fixtures/mockProject.ts
export const mockProject: Project = {
  projectName: 'test-novel',
  createdAt: '2024-01-01T00:00:00Z',
  config: {
    volumes: 2,
    chaptersPerVolume: 10,
    wordsPerChapter: 3000
  },
  // ...
};
```

**测试隔离**: 每个测试使用独立的临时目录
```typescript
beforeEach(async () => {
  testDir = await fs.mkdtemp('/tmp/novelagent-test-');
});

afterEach(async () => {
  await fs.remove(testDir);
});
```

### 性能测试

**上下文组装性能**: 确保 < 1秒
```typescript
it('应该在1秒内完成上下文组装', async () => {
  const start = Date.now();
  const context = assembleContext(input);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(1000);
});
```

**校验性能**: 确保 < 5秒
```typescript
it('应该在5秒内完成九项校验', async () => {
  const start = Date.now();
  const results = await runValidations(chapter, context);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(5000);
});
```

## Key Algorithms

### 1. 断点续传算法

**目标**: 支持从任意中断点恢复生成,避免重复工作

**算法实现**:
```typescript
function calculateChapterRange(
  project: Project,
  input: GenerateChaptersInput
): ChapterMeta[] {
  // 1. 获取所有章节元数据
  const allChapters = project.chapters;
  
  // 2. 过滤已完成的章节
  const pendingChapters = allChapters.filter(
    c => c.status !== 'completed' || input.force
  );
  
  // 3. 应用用户指定的范围
  let targetChapters = pendingChapters;
  
  if (input.volume) {
    targetChapters = targetChapters.filter(c => c.volume === input.volume);
  }
  
  if (input.startChapter && input.endChapter) {
    targetChapters = targetChapters.filter(
      c => c.chapter >= input.startChapter && c.chapter <= input.endChapter
    );
  }
  
  if (input.specificChapter) {
    targetChapters = targetChapters.filter(
      c => c.chapter === input.specificChapter
    );
  }
  
  // 4. 按章节顺序排序
  return targetChapters.sort((a, b) => {
    if (a.volume !== b.volume) return a.volume - b.volume;
    return a.chapter - b.chapter;
  });
}
```

**关键点**:
- 每章完成后立即更新`project.json`
- 使用原子写入避免文件损坏
- 支持`--force`选项重新生成已完成章节

### 2. 指数退避重试策略

**目标**: 在网络错误或API限流时自动重试,避免生成失败

**算法实现**:
```typescript
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 最后一次尝试失败,抛出错误
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 计算延迟时间: initialDelay * factor^attempt
      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt),
        maxDelay
      );
      
      // 添加随机抖动,避免雷鸣群效应
      const jitter = Math.random() * 0.3 * delay;
      const actualDelay = delay + jitter;
      
      if (onRetry) {
        onRetry(attempt + 1, actualDelay, error);
      }
      
      await sleep(actualDelay);
    }
  }
  
  throw lastError;
}
```

**使用示例**:
```typescript
const response = await retryWithExponentialBackoff(
  () => ctx.ai.chat(options),
  {
    maxRetries: 3,
    initialDelay: 1000,  // 1秒
    factor: 2,           // 1s, 2s, 4s
    onRetry: (attempt, delay, error) => {
      ctx.logger.info(`AI请求失败,第${attempt}次重试,等待${delay}ms`, {
        error: error.message
      });
    }
  }
);
```

### 3. 上下文窗口管理算法

**目标**: 在有限的上下文窗口内,优先包含最重要的信息

**算法实现**:
```typescript
function assembleContextWithPriority(
  input: ContextAssemblerInput,
  maxTokens: number
): AssembledContext {
  // 1. 定义优先级列表
  const components: ContextComponent[] = [
    { priority: 1, name: 'chapterOutline', load: () => loadChapterOutline() },
    { priority: 2, name: 'relevantCharacters', load: () => loadRelevantCharacters() },
    { priority: 3, name: 'recentChapters', load: () => loadRecentChapters(3) },
    { priority: 4, name: 'volumeOutline', load: () => loadVolumeOutline() },
    { priority: 5, name: 'worldState', load: () => loadWorldState() },
    { priority: 6, name: 'chapterSummaries', load: () => loadChapterSummaries() },
    { priority: 7, name: 'novelOutline', load: () => loadNovelOutline() }
  ];
  
  // 2. 按优先级加载组件
  const context: Partial<AssembledContext> = {};
  let currentTokens = 0;
  const threshold = maxTokens * 0.8; // 使用80%的窗口
  
  for (const component of components) {
    const data = component.load();
    const tokens = estimateTokens(data);
    
    // 检查是否超过阈值
    if (currentTokens + tokens > threshold) {
      // 优先级1-2的组件不可裁剪
      if (component.priority <= 2) {
        context[component.name] = data;
        currentTokens += tokens;
      } else {
        // 尝试裁剪
        const trimmed = trimContent(data, threshold - currentTokens);
        if (trimmed) {
          context[component.name] = trimmed;
          currentTokens += estimateTokens(trimmed);
        }
        break; // 停止加载更多组件
      }
    } else {
      context[component.name] = data;
      currentTokens += tokens;
    }
  }
  
  return {
    ...context,
    estimatedTokens: currentTokens
  } as AssembledContext;
}

function estimateTokens(content: unknown): number {
  const text = JSON.stringify(content);
  // 粗略估算: 1 token ≈ 4 字符
  return Math.ceil(text.length / 4);
}

function trimContent(content: unknown, maxTokens: number): unknown {
  if (Array.isArray(content)) {
    // 数组类型: 截取前N项
    let tokens = 0;
    const result = [];
    for (const item of content) {
      const itemTokens = estimateTokens(item);
      if (tokens + itemTokens > maxTokens) break;
      result.push(item);
      tokens += itemTokens;
    }
    return result.length > 0 ? result : null;
  }
  
  if (typeof content === 'string') {
    // 字符串类型: 截取前N个字符
    const maxChars = maxTokens * 4;
    return content.length > maxChars 
      ? content.substring(0, maxChars) + '...'
      : content;
  }
  
  return null;
}
```

**关键点**:
- 使用80%的上下文窗口,留20%给生成内容
- 章级大纲和角色档案不可裁剪
- 数组类型内容按项截取,字符串类型按字符截取

### 4. 摘要生成算法

**目标**: 为历史章节生成精简摘要,节省上下文空间

**算法实现**:
```typescript
async function generateChapterSummary(
  chapter: Chapter,
  config: SummaryConfig
): Promise<ChapterSummary> {
  // 1. 构建摘要提示词
  const prompt = `
请为以下章节生成摘要,提取关键信息:

章节内容:
${chapter.content}

要求:
1. 提取关键事件(3-5个)
2. 记录每个角色的主要动作
3. 记录状态变化(位置、物品、情绪等)
4. 摘要长度控制在原文的${config.summaryLengthRatio * 100}%

输出JSON格式:
{
  "keyEvents": ["事件1", "事件2", ...],
  "characterActions": {
    "角色ID": ["动作1", "动作2", ...]
  },
  "stateChanges": [
    {
      "entityType": "character",
      "entityId": "char_001",
      "property": "location",
      "newValue": "loc_beijing",
      "reason": "乘坐火车前往"
    }
  ]
}
`;
  
  // 2. 调用AI生成摘要
  const response = await ctx.ai.chat({
    model: 'json',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3 // 低温度,确保输出稳定
  });
  
  // 3. 解析响应
  const summary = JSON.parse(response.content);
  
  // 4. 添加元数据
  return {
    chapterId: chapter.id,
    keyEvents: summary.keyEvents,
    characterActions: summary.characterActions,
    stateChanges: summary.stateChanges,
    wordCount: chapter.content.length,
    summaryLength: JSON.stringify(summary).length
  };
}
```

**滑动窗口策略**:
```typescript
function selectChaptersForContext(
  currentChapter: number,
  allChapters: Chapter[]
): { full: Chapter[], summaries: ChapterSummary[] } {
  const full: Chapter[] = [];
  const summaries: ChapterSummary[] = [];
  
  // 前3章: 完整内容
  for (let i = Math.max(0, currentChapter - 3); i < currentChapter; i++) {
    if (i >= currentChapter - 3) {
      full.push(allChapters[i]);
    }
  }
  
  // 第4-10章: 摘要
  for (let i = Math.max(0, currentChapter - 10); i < currentChapter - 3; i++) {
    summaries.push(allChapters[i].summary);
  }
  
  return { full, summaries };
}
```

### 5. 强制修复循环算法

**目标**: 自动修复校验失败的章节,最多N轮

**算法实现**:
```typescript
async function fixLoopWithValidation(
  initialChapter: Chapter,
  context: ValidationContext,
  maxRounds: number
): Promise<{ chapter: Chapter; fixRounds: number; success: boolean }> {
  let chapter = initialChapter;
  let fixRounds = 0;
  
  while (fixRounds < maxRounds) {
    // 1. 执行九项校验
    const validationResults = await runValidations(chapter, context);
    
    // 2. 检查是否全部通过
    const allPassed = validationResults.every(r => r.passed);
    if (allPassed) {
      return { chapter, fixRounds, success: true };
    }
    
    // 3. 收集所有违规项
    const violations = validationResults.flatMap(r => r.violations);
    
    // 4. 构建修复提示词
    const fixPrompt = buildFixPrompt(chapter, violations);
    
    // 5. 调用AI生成修复版本
    const response = await ctx.ai.chat({
      model: 'main',
      messages: [
        { role: 'system', content: '你是一个小说编辑,负责修复章节中的一致性问题' },
        { role: 'user', content: fixPrompt }
      ],
      temperature: 0.7
    });
    
    // 6. 更新章节
    chapter = {
      ...chapter,
      content: response.content
    };
    
    fixRounds++;
    
    // 7. 记录修复日志
    await ctx.logger.saveAIConversation(
      `phase4-chapters/${chapter.id}/fix-round-${fixRounds}.json`,
      {
        request: { prompt: fixPrompt },
        response: { content: response.content },
        violations,
        timestamp: new Date().toISOString()
      }
    );
  }
  
  // 达到最大轮次仍未修复成功
  return { chapter, fixRounds, success: false };
}

function buildFixPrompt(chapter: Chapter, violations: Violation[]): string {
  const violationList = violations
    .map((v, i) => `${i + 1}. [${v.type}] ${v.message}${v.suggestedFix ? `\n   建议: ${v.suggestedFix}` : ''}`)
    .join('\n');
  
  return `
请修复以下章节中的一致性问题:

原章节内容:
${chapter.content}

检测到的问题:
${violationList}

要求:
1. 保持章节的整体结构和情节
2. 修复所有列出的问题
3. 确保修复后的内容符合世界观设定
4. 保持文风一致

请输出修复后的完整章节内容:
`;
}
```

**关键点**:
- 每轮修复后重新执行完整校验
- 记录每轮修复的prompt和response
- 达到最大轮次后记录错误但继续生成下一章

### 6. 并行校验算法

**目标**: 同时执行九项校验,提高效率

**算法实现**:
```typescript
async function runValidationsInParallel(
  chapter: Chapter,
  context: ValidationContext
): Promise<ValidationResult[]> {
  // 1. 定义所有校验函数
  const validationFunctions = [
    () => validateWorldRules(chapter, context.worldRules, context.worldState),
    () => validateSpacetime(chapter, context.timeline, context.characterStates),
    () => validateInformationLogic(chapter, context.characterStates),
    () => validateCharacterBehavior(chapter, context.characters),
    () => validateAbility(chapter, context.characters),
    () => validateInventory(chapter, context.characterStates),
    () => validateHooks(chapter, context.chapterOutline, context.worldState.hooks),
    () => validateBackground(chapter, context.worldState),
    () => validateNarrativeLogic(chapter, context.chapterOutline)
  ];
  
  // 2. 并行执行所有校验
  const results = await Promise.all(
    validationFunctions.map(fn => fn())
  );
  
  // 3. 记录校验结果
  await ctx.logger.saveAIConversation(
    `validation-reports/${chapter.id}.json`,
    {
      chapterId: chapter.id,
      timestamp: new Date().toISOString(),
      results: results.map((r, i) => ({
        rule: validationFunctions[i].name,
        passed: r.passed,
        violations: r.violations
      }))
    }
  );
  
  return results;
}
```

**性能优化**:
- 使用`Promise.all`并行执行
- 每个校验函数独立,无依赖关系
- 目标: 总时间 < 5秒

## Implementation Details

### 目录结构

```
novelagent/
├── src/
│   ├── core/                      # Core层
│   │   ├── models/                # 领域模型
│   │   │   ├── character.ts
│   │   │   ├── location.ts
│   │   │   ├── outline.ts
│   │   │   ├── chapter.ts
│   │   │   ├── worldState.ts
│   │   │   ├── project.ts
│   │   │   └── requirements.ts
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
│   │   ├── effects.ts             # Effect类型定义
│   │   ├── errors.ts              # 错误类型
│   │   ├── dto.ts                 # 输入/输出类型
│   │   └── ports.ts               # Port接口定义
│   │
│   ├── bus/                       # Bus层
│   │   ├── commands.ts            # Command类型
│   │   ├── dispatcher.ts          # Dispatcher
│   │   ├── effectRunner.ts        # Effect Runner
│   │   └── handlers/              # Command handlers
│   │       ├── initProject.ts
│   │       ├── testAIConnection.ts
│   │       ├── generateFramework.ts
│   │       ├── generateChapters.ts
│   │       └── exportProject.ts
│   │
│   ├── adapters/                  # Adapter层
│   │   ├── aiAdapter.ts           # AI适配器
│   │   ├── storageAdapter.ts      # 存储适配器
│   │   ├── loggerAdapter.ts       # 日志适配器
│   │   └── uiAdapter.ts           # UI适配器
│   │
│   ├── shells/                    # Shell层
│   │   ├── cli/                   # CLI实现
│   │   │   └── index.ts
│   │   ├── tui/                   # TUI实现
│   │   │   └── index.ts
│   │   └── contextBuilder.ts      # AppContext构建器
│   │
│   ├── config/                    # 配置相关
│   │   ├── loader.ts              # 配置加载器
│   │   ├── schema.ts              # 配置schema
│   │   └── defaults.ts            # 默认配置
│   │
│   └── utils/                     # 工具函数
│       ├── retry.ts               # 重试逻辑
│       ├── tokenEstimator.ts      # Token估算
│       └── pathSanitizer.ts       # 路径安全检查
│
├── tests/
│   ├── core/                      # Core层测试
│   │   ├── usecases/
│   │   ├── models/
│   │   └── rules/
│   ├── bus/                       # Bus层测试
│   ├── adapters/                  # Adapter层测试
│   ├── e2e/                       # 端到端测试
│   └── fixtures/                  # 测试数据
│
├── docs/                          # 文档
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 配置文件示例

**config.yaml**:
```yaml
# AI模型配置
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: ${DASHSCOPE_API_KEY}  # 支持环境变量
    model: qwen-plus
    temperature: 0.7
    maxTokens: 32768
  
  jsonModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: ${DASHSCOPE_API_KEY}
    model: qwen-plus
    temperature: 0.3
    maxTokens: 8192

# 生成配置
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3

# 日志配置
logging:
  logLevel: info  # debug | info | error
  logDir: logs

# 摘要配置
summary:
  summaryLengthRatio: 0.15  # 15%
```

### 项目数据结构示例

**project.json**:
```json
{
  "projectName": "magic-school",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "config": {
    "volumes": 3,
    "chaptersPerVolume": 10,
    "wordsPerChapter": 3000
  },
  "progress": {
    "currentPhase": "phase4",
    "completedChapters": 15,
    "totalChapters": 30
  },
  "chapters": [
    {
      "volume": 1,
      "chapter": 1,
      "title": "入学典礼",
      "wordCount": 3200,
      "status": "completed",
      "generatedAt": "2024-01-01T10:00:00Z",
      "fixRounds": 1
    }
  ],
  "statistics": {
    "totalWords": 48000,
    "totalAICalls": 120,
    "totalTokens": 500000,
    "totalFixRounds": 8
  },
  "status": "generating"
}
```

### AI Prompt设计

**Phase 1 - 需求理解Prompt**:
```
你是一个资深小说策划,负责将创意描述转化为结构化需求。

用户创意:
{creativeDescription}

请分析并生成以下结构化需求:

1. 小说类型: (玄幻/科幻/都市/历史等)
2. 目标读者:
   - 年龄段:
   - 阅读偏好:
3. 核心冲突:
   - 主要矛盾:
   - 对立双方:
4. 主题: (核心思想、价值观)
5. 情感基调: (整体氛围、情绪走向)
6. 故事背景:
   - 时代:
   - 地域:
   - 社会环境:
7. 叙事视角: (第一人称/第三人称、全知/限知)
8. 预期篇幅:
   - 总字数:
   - 章节数:
9. 核心卖点: (吸引读者的独特元素)

输出YAML格式。
```

**Phase 4 - 章节生成Prompt**:
```
你是一个专业小说作家,负责根据大纲生成章节正文。

# 章节大纲
{chapterOutline}

# 角色档案
{relevantCharacters}

# 前文内容
{recentChapters}

# 世界状态
{worldState}

要求:
1. 严格按照章节大纲的场景和事件展开
2. 保持角色性格和行为一致性
3. 注意埋设/回收指定的伏笔
4. 字数控制在{wordsPerChapter}字左右
5. 保持情感基调从"{emotionalTone.start}"到"{emotionalTone.end}"的变化

请生成章节正文:
```

**校验失败修复Prompt**:
```
你是一个小说编辑,负责修复章节中的一致性问题。

# 原章节内容
{chapterContent}

# 检测到的问题
{violations}

要求:
1. 保持章节的整体结构和情节
2. 修复所有列出的问题
3. 确保修复后的内容符合世界观设定
4. 保持文风一致

请输出修复后的完整章节内容:
```

### 安全性设计

**1. API Key保护**:
```typescript
function sanitizeConfig(config: Config): Config {
  return {
    ...config,
    ai: {
      mainModel: {
        ...config.ai.mainModel,
        apiKey: '***'  // 日志中隐藏API Key
      },
      jsonModel: {
        ...config.ai.jsonModel,
        apiKey: '***'
      }
    }
  };
}
```

**2. 路径遍历防护**:
```typescript
function sanitizePath(userPath: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, userPath);
  
  // 确保解析后的路径在baseDir内
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new AppError(
      'FILE_ACCESS_DENIED',
      '非法路径访问',
      { path: userPath }
    );
  }
  
  return resolved;
}
```

**3. 日志脱敏**:
```typescript
function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'string') {
    // 脱敏API Key
    return data.replace(/sk-[a-zA-Z0-9]{32,}/g, 'sk-***');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('token')) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}
```

### 性能优化

**1. 文件缓存**:
```typescript
class CachedStorageAdapter implements StoragePort {
  private cache = new Map<string, { content: string; mtime: number }>();
  
  async readFile(path: string): Promise<string> {
    const stat = await fs.stat(path);
    const cached = this.cache.get(path);
    
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.content;
    }
    
    const content = await fs.readFile(path, 'utf-8');
    this.cache.set(path, { content, mtime: stat.mtimeMs });
    return content;
  }
}
```

**2. Token估算优化**:
```typescript
// 使用简单的字符计数,避免调用tokenizer库
function estimateTokens(text: string): number {
  // 中文: 1字符 ≈ 1 token
  // 英文: 4字符 ≈ 1 token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return chineseChars + Math.ceil(otherChars / 4);
}
```

**3. 内存管理**:
```typescript
// 避免一次性加载所有章节到内存
async function* iterateChapters(projectPath: string) {
  const chapterFiles = await fs.readdir(`${projectPath}/chapters`);
  
  for (const file of chapterFiles) {
    const content = await fs.readFile(`${projectPath}/chapters/${file}`, 'utf-8');
    yield { file, content };
    // 每次只保留一个章节在内存中
  }
}
```

