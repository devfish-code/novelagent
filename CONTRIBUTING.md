# 贡献指南

感谢你对NovelAgent项目的关注！我们欢迎各种形式的贡献，包括但不限于：

- 报告Bug
- 提出新功能建议
- 改进文档
- 提交代码修复或新功能

## 开发环境搭建

### 前置要求

- Node.js >= 20.0.0
- npm >= 9.0.0
- Git

### 克隆仓库

```bash
git clone <repository-url>
cd novelagent
```

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 类型检查

```bash
npm run typecheck
```

### 代码规范检查

```bash
npm run lint
```

## 项目结构

```
novelagent/
├── src/                    # 源代码
│   ├── core/              # Core层 - 纯业务逻辑
│   │   ├── models/        # 领域模型
│   │   ├── usecases/      # 五阶段工作流
│   │   ├── rules/         # 九项校验规则
│   │   ├── rag/           # RAG上下文组装
│   │   ├── effects.ts     # Effect类型定义
│   │   ├── errors.ts      # 错误类型
│   │   └── ports.ts       # Port接口定义
│   ├── bus/               # Bus层 - 命令分发
│   │   ├── handlers/      # 命令处理器
│   │   ├── commands.ts    # Command类型
│   │   ├── dispatcher.ts  # 分发器
│   │   └── effectRunner.ts # Effect执行器
│   ├── adapters/          # Adapter层 - 外部集成
│   │   ├── aiAdapter.ts   # AI适配器
│   │   ├── storageAdapter.ts # 存储适配器
│   │   ├── loggerAdapter.ts  # 日志适配器
│   │   └── uiAdapter.ts   # UI适配器
│   ├── shells/            # Shell层 - 用户界面
│   │   ├── cli/           # CLI实现
│   │   ├── tui/           # TUI实现
│   │   └── contextBuilder.ts # AppContext构建器
│   ├── config/            # 配置管理
│   └── utils/             # 工具函数
├── tests/                 # 测试文件
├── dist/                  # 编译输出
└── docs/                  # 文档
```

## 架构原则

NovelAgent遵循严格的Core-Shell架构：

### Core层规则

1. **禁止导入框架**: Core层不能导入Commander.js、@inquirer/prompts等Shell框架
2. **仅允许的依赖**: Zod（类型校验）、chalk（彩色输出）
3. **Effect模式**: Use Case函数只返回Effect声明，不直接执行I/O
4. **纯函数优先**: 尽可能使用纯函数，便于测试

### Bus层规则

1. **命令分发**: 负责路由Command到对应的handler
2. **Effect执行**: 统一执行所有Effect声明
3. **错误处理**: 统一的错误处理和日志记录

### Shell层规则

1. **轻量适配**: 每个命令处理器限制在10行以内
2. **职责单一**: 仅负责解析输入、构建Command、调用dispatch、格式化输出
3. **无业务逻辑**: 不包含任何业务逻辑

## 代码规范

### TypeScript规范

- 使用严格模式（`strict: true`）
- 优先使用接口（interface）而非类型别名（type）
- 使用明确的类型注解，避免`any`
- 使用ES Modules（`import/export`）

### 命名规范

- 文件名：camelCase（如：`aiAdapter.ts`）
- 类名：PascalCase（如：`OpenAICompatibleAdapter`）
- 函数名：camelCase（如：`buildAppContext`）
- 常量：UPPER_SNAKE_CASE（如：`MAX_RETRIES`）
- 接口：PascalCase，Port接口以Port结尾（如：`AIPort`）

### 注释规范

- 使用JSDoc注释公共API
- 复杂逻辑添加行内注释
- 每个文件顶部添加模块说明

示例：

```typescript
/**
 * AI适配器 - 实现OpenAI兼容API调用
 * 
 * 职责:
 * - 调用AI模型API
 * - 实现重试逻辑
 * - 错误分类和处理
 */
export class OpenAICompatibleAdapter implements AIPort {
  /**
   * 调用AI模型
   * @param options - 调用选项
   * @returns AI响应
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    // 实现...
  }
}
```

## 测试要求

### 测试覆盖率目标

- Core层: >= 90%
- Bus层: >= 80%
- Adapter层: >= 70%
- Shell层: >= 50%

### 测试类型

1. **单元测试**: 测试单个函数或类
2. **集成测试**: 测试多个模块的协作
3. **端到端测试**: 测试完整的用户流程

### 测试文件命名

- 测试文件放在`tests/`目录
- 文件名与源文件对应：`src/core/models/character.ts` → `tests/core/models/character.test.ts`

### 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { validateWorldRules } from '../../src/core/rules/worldRuleValidation.js';

describe('validateWorldRules', () => {
  it('应该检测违反世界规则的内容', () => {
    const chapter = { content: '张三使用魔法飞行...' };
    const context = {
      worldState: {
        worldRules: [
          { id: 'rule_001', description: '人类不能飞行' }
        ]
      }
    };
    
    const result = validateWorldRules(chapter, context);
    
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });
});
```

## 提交规范

### Commit Message格式

使用约定式提交（Conventional Commits）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：

```
feat(core): 实现世界规则校验

- 添加validateWorldRules函数
- 实现规则匹配逻辑
- 添加单元测试

Closes #123
```

### 分支策略

- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支

### Pull Request流程

1. Fork项目到你的账号
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交代码：`git commit -m "feat: add my feature"`
4. 推送到你的仓库：`git push origin feature/my-feature`
5. 创建Pull Request到`develop`分支

### PR要求

- 通过所有测试
- 代码覆盖率不降低
- 通过代码规范检查
- 添加必要的文档
- 描述清晰，说明改动原因和影响

## 报告Bug

使用GitHub Issues报告Bug，请包含：

- Bug描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node.js版本、操作系统等）
- 相关日志或截图

## 提出新功能

使用GitHub Issues提出新功能建议，请包含：

- 功能描述
- 使用场景
- 预期效果
- 可能的实现方案

## 代码审查

所有PR都需要经过代码审查：

- 至少一位维护者批准
- 通过所有自动化检查
- 解决所有审查意见

## 发布流程

1. 更新版本号（遵循语义化版本）
2. 更新CHANGELOG.md
3. 创建Git标签
4. 发布到npm

## 获取帮助

- 查看[文档](./README.md)
- 提交[Issue](https://github.com/your-repo/issues)
- 加入讨论区

## 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 关注项目目标

感谢你的贡献！🎉
