# NovelAgent

AI驱动的长篇小说自动生成CLI工具

## 简介

NovelAgent是一个基于AI的长篇小说自动生成系统，通过五阶段工作流和九项校验规则，实现高质量长篇小说的自动化生成，解决AI写作中的一致性问题（角色设定漂移、伏笔遗忘、时间线混乱等）。

### 核心特性

- **五阶段工作流**: 需求理解 → 世界构建 → 大纲规划 → 逐章生成 → 全书校验
- **九项校验规则**: 自动检测并修复一致性问题
- **断点续传**: 支持从中断处继续生成
- **强制修复机制**: 自动修复校验失败的章节
- **Core-Shell架构**: 业务逻辑与框架完全分离

## 系统要求

- Node.js >= 20.0.0
- 支持OpenAI兼容API的AI服务（如OpenAI、通义千问等）

## 安装

```bash
npm install -g novelagent
```

或从源码安装：

```bash
git clone <repository-url>
cd novelagent
npm install
npm run build
npm link
```

## 快速开始

### 交互式界面（推荐新手）

直接运行命令启动交互式界面：

```bash
novelagent
```

TUI会引导你完成整个创作流程，包括：
- 初始化项目
- 测试AI连接
- 生成小说框架
- 生成章节
- 导出产物
- 查看生成报告

### 命令行模式（推荐高级用户）

#### 1. 初始化项目

```bash
novelagent init
```

这将在当前目录创建`config.yaml`配置文件和必要的目录结构。

#### 2. 配置AI模型

编辑`config.yaml`文件，配置你的AI服务：

```yaml
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

generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3

logging:
  logLevel: info
  logDir: logs

summary:
  summaryLengthRatio: 0.15
```

#### 3. 测试AI连接

```bash
novelagent test
```

#### 4. 生成小说框架

```bash
novelagent framework "一个关于时间旅行的科幻故事" --name time-travel
```

这将执行：
- Phase 1: 需求理解（生成结构化需求）
- Phase 2: 世界构建（生成角色、地点、规则）
- Phase 3: 大纲规划（生成三层大纲）

#### 5. 生成章节

```bash
novelagent chapters time-travel
```

这将执行：
- Phase 4: 逐章生成（生成所有章节并校验）
- Phase 5: 全书校验（生成质量报告）

#### 6. 导出小说

```bash
novelagent export time-travel
```

导出的文件包括：
- `novel.md`: 完整小说
- `world.md`: 世界观文档
- `characters.md`: 角色档案
- `outline.md`: 大纲文档
- `timeline.md`: 时间线
- `report.md`: 质量报告

## 命令参考

### init - 初始化项目

```bash
novelagent init [options]
```

选项：
- `--dir <path>`: 指定工作目录（默认：当前目录）
- `--force`: 强制覆盖已存在的配置文件

### test - 测试AI连接

```bash
novelagent test [options]
```

选项：
- `--model <type>`: 测试的模型类型（main/json/all，默认：all）

### framework - 生成小说框架

```bash
novelagent framework <description> [options]
```

参数：
- `<description>`: 创意描述（一句话概括你的小说）

选项：
- `--name <name>`: 项目名称（必需）
- `--volumes <number>`: 卷数
- `--chapters-per-volume <number>`: 每卷章数
- `--words-per-chapter <number>`: 每章字数
- `--dir <path>`: 工作目录

### chapters - 生成章节

```bash
novelagent chapters <project> [options]
```

参数：
- `<project>`: 项目名称

选项：
- `--volume <number>`: 仅生成指定卷
- `--range <start-end>`: 生成指定范围的章节（如：1-10）
- `--chapter <number>`: 仅生成指定章节
- `--force`: 重新生成已存在的章节
- `--dir <path>`: 工作目录

### export - 导出小说

```bash
novelagent export <project> [options]
```

参数：
- `<project>`: 项目名称

选项：
- `--format <type>`: 导出格式（markdown/json，默认：markdown）
- `--output <path>`: 输出目录（默认：exports/）
- `--dir <path>`: 工作目录

## 项目结构

生成的项目目录结构：

```
my-novel/
├── config.yaml           # 配置文件
├── project.json          # 项目元数据
├── requirements.md       # 需求文档
├── world/                # 世界构建
│   ├── world-state.yaml  # 世界状态
│   ├── characters/       # 角色档案
│   ├── locations/        # 地点档案
│   └── rules/            # 世界规则
├── outline/              # 大纲
│   ├── novel.yaml        # 全书大纲
│   ├── volume-*.yaml     # 卷大纲
│   └── chapters/         # 章级大纲
├── chapters/             # 章节正文
│   ├── vol-1-ch-001.md
│   ├── vol-1-ch-002.md
│   └── summaries/        # 章节摘要
├── exports/              # 导出产物
│   ├── novel.md
│   ├── world.md
│   └── report.md
└── logs/                 # 日志
    ├── novel-generation.log
    └── ai-conversations/ # AI对话记录
```

## 九项校验规则

NovelAgent自动执行以下校验：

1. **世界规则校验**: 检查是否违反已设定的世界规则
2. **时空校验**: 检查角色能否在该时间出现在该地点
3. **信息逻辑校验**: 检查角色是否使用了不该知道的信息
4. **角色行为校验**: 检查行为是否符合性格档案和动机
5. **能力校验**: 检查展示的能力是否在能力范围内
6. **物品状态校验**: 检查使用的物品是否确实持有
7. **伏笔校验**: 检查计划埋设/回收的伏笔是否完成
8. **常识背景校验**: 检查是否出现与世界背景不符的事物
9. **叙事逻辑校验**: 检查大纲功能是否完成且因果链是否清晰

## 断点续传

NovelAgent支持断点续传，如果生成过程中断：

```bash
# 继续生成
novelagent chapters my-novel
```

系统会自动检测已完成的章节，从中断处继续。

## 环境变量

支持在配置文件中使用环境变量：

```yaml
apiKey: ${DASHSCOPE_API_KEY}
```

或在命令行中设置：

```bash
export DASHSCOPE_API_KEY=your-api-key
novelagent test
```

## 开发

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

### 测试覆盖率

```bash
npm run test:coverage
```

### 类型检查

```bash
npm run typecheck
```

## 架构

NovelAgent采用Core-Shell三层架构：

- **Core层**: 纯业务逻辑，包含五阶段工作流、九项校验规则、领域模型
- **Bus层**: 命令分发和副作用执行
- **Shell层**: CLI和TUI适配层

详细架构文档请参考：
- [产品需求文档](./01-PRD-产品需求文档.md)
- [技术架构文档](./02-ARCHITECTURE-技术架构文档.md)

## 许可证

MIT

## 贡献

欢迎提交Issue和Pull Request！

## 支持

如有问题，请提交Issue或联系维护者。
