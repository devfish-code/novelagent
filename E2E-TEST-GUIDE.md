# NovelAgent E2E测试指南

本文档说明如何运行NovelAgent的完整端到端(E2E)测试。

## 测试概述

E2E测试会执行完整的小说生成流程,包括:

1. ✅ 初始化项目 (`novelagent init`)
2. ✅ 配置AI模型
3. ✅ 测试AI连接 (`novelagent test`)
4. ✅ 生成小说框架 (`novelagent framework`) - Phase 1-3
5. ✅ 生成第一章 (`novelagent chapters --chapter 1`)
6. ✅ 生成剩余章节 (`novelagent chapters`) - 断点续传测试
7. ✅ 导出产物 (`novelagent export`)
8. ✅ 验证完整性

## 前置要求

### 1. API Key

E2E测试需要真实的OpenAI兼容API Key。支持的服务商包括:
- OpenAI (官方)
- Azure OpenAI
- 其他OpenAI兼容服务 (如DeepSeek, 通义千问等)

### 2. 预计成本

使用 `gpt-3.5-turbo` 模型:
- **预计耗时**: 15-20分钟
- **预计成本**: $0.50-$1.00 USD
- **Token消耗**: 约50,000-100,000 tokens

使用 `gpt-4` 模型:
- **预计耗时**: 20-30分钟
- **预计成本**: $5.00-$10.00 USD

### 3. 网络要求

- 稳定的网络连接
- 能够访问API服务商的endpoint

## 快速开始

### Windows (PowerShell)

```powershell
# 1. 设置API Key (必需)
$env:NOVELAGENT_TEST_API_KEY="your-api-key-here"

# 2. 可选配置
$env:NOVELAGENT_TEST_BASE_URL="https://api.openai.com/v1"  # 默认OpenAI
$env:NOVELAGENT_TEST_MODEL="gpt-3.5-turbo"  # 默认模型

# 3. 运行测试脚本
.\run-e2e-test.ps1

# 或者直接运行测试
npm test -- tests/e2e/complete-workflow.test.ts
```

### Linux / macOS

```bash
# 1. 设置API Key (必需)
export NOVELAGENT_TEST_API_KEY="your-api-key-here"

# 2. 可选配置
export NOVELAGENT_TEST_BASE_URL="https://api.openai.com/v1"  # 默认OpenAI
export NOVELAGENT_TEST_MODEL="gpt-3.5-turbo"  # 默认模型

# 3. 运行测试脚本
./run-e2e-test.sh

# 或者直接运行测试
npm test -- tests/e2e/complete-workflow.test.ts
```

## 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `NOVELAGENT_TEST_API_KEY` | ✅ 是 | - | OpenAI兼容API的Key |
| `NOVELAGENT_TEST_BASE_URL` | ❌ 否 | `https://api.openai.com/v1` | API基础URL |
| `NOVELAGENT_TEST_MODEL` | ❌ 否 | `gpt-3.5-turbo` | 使用的模型名称 |
| `NOVELAGENT_KEEP_TEST_DIR` | ❌ 否 | `false` | 是否保留测试目录用于调试 |

## 使用不同服务商

### OpenAI (官方)

```powershell
$env:NOVELAGENT_TEST_API_KEY="sk-..."
$env:NOVELAGENT_TEST_BASE_URL="https://api.openai.com/v1"
$env:NOVELAGENT_TEST_MODEL="gpt-3.5-turbo"
```

### Azure OpenAI

```powershell
$env:NOVELAGENT_TEST_API_KEY="your-azure-key"
$env:NOVELAGENT_TEST_BASE_URL="https://your-resource.openai.azure.com/openai/deployments/your-deployment"
$env:NOVELAGENT_TEST_MODEL="gpt-35-turbo"
```

### DeepSeek

```powershell
$env:NOVELAGENT_TEST_API_KEY="sk-..."
$env:NOVELAGENT_TEST_BASE_URL="https://api.deepseek.com/v1"
$env:NOVELAGENT_TEST_MODEL="deepseek-chat"
```

### 通义千问 (Qwen)

```powershell
$env:NOVELAGENT_TEST_API_KEY="sk-..."
$env:NOVELAGENT_TEST_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:NOVELAGENT_TEST_MODEL="qwen-turbo"
```

## 调试模式

如果测试失败,可以保留测试目录用于调试:

```powershell
# Windows
$env:NOVELAGENT_KEEP_TEST_DIR="true"
.\run-e2e-test.ps1

# Linux/macOS
export NOVELAGENT_KEEP_TEST_DIR="true"
./run-e2e-test.sh
```

测试目录位置: `%TEMP%\novelagent-e2e-*` (Windows) 或 `/tmp/novelagent-e2e-*` (Linux/macOS)

测试目录包含:
```
novelagent-e2e-*/
├── config.yaml           # 配置文件
├── logs/                 # 日志目录
│   ├── novel-generation.log
│   └── ai-conversations/ # AI对话记录
├── test-novel/           # 生成的小说项目
│   ├── requirements.md
│   ├── project.json
│   ├── world/
│   ├── outline/
│   ├── chapters/
│   └── report.md
└── exports/              # 导出的产物
    ├── novel.md
    ├── world.md
    ├── characters.md
    ├── outline.md
    ├── timeline.md
    └── report.md
```

## 常见问题

### Q: 测试失败,显示 "API connection failed"

**A:** 检查以下几点:
1. API Key是否正确
2. 网络连接是否正常
3. Base URL是否正确
4. API配额是否充足

### Q: 测试超时

**A:** E2E测试可能需要15-20分钟。如果超时:
1. 检查网络速度
2. 尝试使用更快的模型 (如 `gpt-3.5-turbo`)
3. 检查API服务商是否有限流

### Q: 如何查看详细日志?

**A:** 
1. 设置 `NOVELAGENT_KEEP_TEST_DIR="true"`
2. 运行测试
3. 查看 `logs/novel-generation.log` 和 `logs/ai-conversations/` 目录

### Q: 测试成本太高怎么办?

**A:** 
1. 使用 `gpt-3.5-turbo` 而不是 `gpt-4`
2. 使用更便宜的兼容服务 (如DeepSeek, 通义千问)
3. 减少测试章节数 (修改测试代码中的 `chaptersPerVolume`)

## 测试验证项

E2E测试会验证以下内容:

### 文件结构
- ✅ 配置文件 (`config.yaml`)
- ✅ 需求文档 (`requirements.md`)
- ✅ 项目元数据 (`project.json`)
- ✅ 世界设定文件 (`world/`)
- ✅ 大纲文件 (`outline/`)
- ✅ 章节文件 (`chapters/`)
- ✅ 生成报告 (`report.md`)
- ✅ 导出产物 (`exports/`)

### 功能验证
- ✅ AI连接测试
- ✅ Phase 1-3 框架生成
- ✅ Phase 4 章节生成
- ✅ Phase 5 质量报告
- ✅ 断点续传功能
- ✅ 导出功能

### 数据验证
- ✅ 章节字数 > 0
- ✅ 角色档案数量 >= 5
- ✅ 所有章节状态为 "completed"
- ✅ project.json 统计信息正确
- ✅ 导出文件内容完整

## 手动测试替代方案

如果不想运行自动化E2E测试,可以手动测试:

```bash
# 1. 构建项目
npm run build

# 2. 初始化
node dist/shells/cli/index.js init

# 3. 编辑 config.yaml,填入API Key

# 4. 测试连接
node dist/shells/cli/index.js test

# 5. 生成框架
node dist/shells/cli/index.js framework "一个关于时间旅行的故事" --name test-novel

# 6. 生成章节
node dist/shells/cli/index.js chapters test-novel

# 7. 导出
node dist/shells/cli/index.js export test-novel
```

## 下一步

E2E测试通过后,您可以:

1. ✅ 标记任务17为完成
2. ✅ 准备发布 v0.1.0
3. ✅ 编写发布说明
4. ✅ 发布到npm (可选)

## 支持

如有问题,请查看:
- 项目README.md
- CONTRIBUTING.md
- GitHub Issues
