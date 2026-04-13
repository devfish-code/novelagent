# Implementation Plan: NovelAgent

## Overview

本实现计划将NovelAgent系统分解为可独立完成的编码任务。系统采用Core-Shell三层架构,通过五阶段工作流和九项校验规则实现AI驱动的长篇小说自动生成。

实现策略:
- 自底向上构建: 先Core层(纯逻辑)→Bus层(命令分发)→Adapter层(外部集成)→Shell层(用户界面)
- 增量验证: 每个模块完成后立即编写测试,确保功能正确
- 关键路径优先: 优先实现核心生成流程,次要功能(如TUI、导出)后置

## Tasks

- [x] 1. 项目基础设施搭建
  - 创建package.json,配置TypeScript、Vitest、依赖项
  - 创建tsconfig.json,配置ES Modules、类型检查
  - 创建目录结构(src/core、src/bus、src/adapters、src/shells、tests)
  - 配置Vitest测试框架和覆盖率报告
  - _Requirements: 16.1, 16.4_

- [x] 2. Core层 - 基础类型和接口定义
  - [x] 2.1 定义Effect类型和Port接口
    - 在src/core/effects.ts中定义所有Effect类型(AI_CHAT、SAVE_FILE、LOG_INFO等)
    - 在src/core/ports.ts中定义AIPort、StoragePort、LoggerPort、UIPort接口
    - _Requirements: 8.3, 8.8_
  
  - [x] 2.2 定义错误类型
    - 在src/core/errors.ts中实现AppError类
    - 定义所有错误码常量(CONFIG_NOT_FOUND、AI_CONNECTION_FAILED等)
    - _Requirements: 13.10_
  
  - [x] 2.3 定义领域模型
    - 在src/core/models/目录下创建Character、Location、Outline、Chapter、WorldState、Project、Requirements模型
    - 使用Zod定义运行时类型校验schema
    - _Requirements: 3.10, 18.1-18.9, 19.1-19.13, 20.1-20.14_

- [x] 3. Core层 - 工具函数
  - [x] 3.1 实现Token估算器
    - 在src/utils/tokenEstimator.ts中实现estimateTokens函数
    - 支持中英文混合文本的token估算(中文1字符≈1token,英文4字符≈1token)
    - _Requirements: 21.12_
  
  - [x] 3.2 实现重试逻辑
    - 在src/utils/retry.ts中实现retryWithExponentialBackoff函数
    - 支持指数退避、随机抖动、最大延迟限制
    - _Requirements: 12.5_
  
  - [x] 3.3 实现路径安全检查
    - 在src/utils/pathSanitizer.ts中实现sanitizePath函数
    - 防止路径遍历攻击
    - _Requirements: 15.8_

- [x] 4. Core层 - RAG上下文组装
  - [x] 4.1 实现上下文组装器
    - 在src/core/rag/contextAssembler.ts中实现assembleContext函数
    - 实现优先级排序、token估算、内容裁剪逻辑
    - 确保组装时间<1秒
    - _Requirements: 21.1-21.13, 12.1_
  
  - [x] 4.2 编写上下文组装器单元测试
    - 测试优先级排序是否正确
    - 测试超过token限制时的裁剪逻辑
    - 测试性能要求(<1秒)
    - _Requirements: 21.1-21.13_
  
  - [x] 4.3 实现摘要管理器
    - 在src/core/rag/summaryManager.ts中实现generateSummary函数
    - 实现滑动窗口策略(前3章完整+第4-10章摘要)
    - _Requirements: 22.1-22.12_
  
  - [x] 4.4 编写摘要管理器单元测试
    - 测试摘要生成逻辑
    - 测试滑动窗口选择逻辑
    - _Requirements: 22.1-22.12_

- [x] 5. Core层 - 九项校验规则
  - [x] 5.1 实现校验规则基础设施
    - 在src/core/rules/index.ts中定义ValidationRule接口、ValidationResult、Violation类型
    - 实现runValidationsInParallel函数,并行执行所有校验
    - _Requirements: 9.19_
  
  - [x] 5.2 实现世界规则校验
    - 在src/core/rules/worldRuleValidation.ts中实现validateWorldRules函数
    - 检测章节内容是否违反世界规则
    - _Requirements: 9.1, 9.2_
  
  - [x] 5.3 实现时空校验
    - 在src/core/rules/spacetimeValidation.ts中实现validateSpacetime函数
    - 基于时间线和移动速度检测角色位置合理性
    - _Requirements: 9.3, 9.4_
  
  - [x] 5.4 实现信息逻辑校验
    - 在src/core/rules/informationValidation.ts中实现validateInformationLogic函数
    - 检测角色是否使用了不该知道的信息
    - _Requirements: 9.5, 9.6_
  
  - [x] 5.5 实现角色行为校验
    - 在src/core/rules/characterValidation.ts中实现validateCharacterBehavior函数
    - 检测行为是否符合性格档案和动机
    - _Requirements: 9.7, 9.8_
  
  - [x] 5.6 实现能力校验
    - 在src/core/rules/abilityValidation.ts中实现validateAbility函数
    - 检测能力是否在范围内
    - _Requirements: 9.9, 9.10_
  
  - [x] 5.7 实现物品状态校验
    - 在src/core/rules/inventoryValidation.ts中实现validateInventory函数
    - 检测物品持有状态
    - _Requirements: 9.11, 9.12_
  
  - [x] 5.8 实现伏笔校验
    - 在src/core/rules/hookValidation.ts中实现validateHooks函数
    - 检测伏笔埋设和回收
    - _Requirements: 9.13, 9.14_
  
  - [x] 5.9 实现常识背景校验
    - 在src/core/rules/backgroundValidation.ts中实现validateBackground函数
    - 检测与世界背景不符的事物
    - _Requirements: 9.15, 9.16_
  
  - [x] 5.10 实现叙事逻辑校验
    - 在src/core/rules/narrativeValidation.ts中实现validateNarrativeLogic函数
    - 检测大纲功能完成度和因果链
    - _Requirements: 9.17, 9.18_
  
  - [x] 5.11 编写校验规则单元测试
    - 为每个校验规则编写测试用例
    - 测试各种违规场景和边界情况
    - 测试并行执行性能(<5秒)
    - _Requirements: 9.1-9.21, 12.2_

- [x] 6. Core层 - Use Cases (五阶段工作流)
  - [x] 6.1 实现Phase1需求理解
    - 在src/core/usecases/phase1UnderstandRequirements.ts中实现phase1UnderstandRequirements函数
    - 返回AI_CHAT和SAVE_FILE的Effect声明
    - 生成结构化Requirements对象
    - _Requirements: 3.1, 18.1-18.12_
  
  - [x] 6.2 编写Phase1单元测试
    - 测试从创意描述生成结构化需求
    - 测试返回的Effect声明正确性
    - _Requirements: 3.1_
  
  - [x] 6.3 实现Phase2世界构建
    - 在src/core/usecases/phase2WorldBuilding.ts中实现phase2WorldBuilding函数
    - 生成世界观、角色档案(至少5个)、地点档案、规则体系
    - 返回AI_CHAT和SAVE_FILE的Effect声明
    - _Requirements: 3.2, 3.10_
  
  - [x] 6.4 编写Phase2单元测试
    - 测试世界状态初始化
    - 测试角色档案生成(至少5个核心角色)
    - _Requirements: 3.2, 3.10_
  
  - [x] 6.5 实现Phase3大纲规划
    - 在src/core/usecases/phase3OutlinePlanning.ts中实现phase3OutlinePlanning函数
    - 生成三层大纲(全书→卷→章)
    - 返回AI_CHAT和SAVE_FILE的Effect声明
    - _Requirements: 3.3, 3.11_
  
  - [x] 6.6 编写Phase3单元测试
    - 测试三层大纲结构生成
    - 测试章节数量计算
    - _Requirements: 3.3, 3.11_
  
  - [x] 6.7 实现Phase4章节生成核心逻辑
    - 在src/core/usecases/phase4ChapterGeneration.ts中实现phase4ChapterGeneration函数
    - 实现完整的生成流程: 组装上下文→生成初稿→提取状态→校验→修复循环→润色
    - 实现强制修复循环(最多N轮)
    - _Requirements: 4.9-4.19, 10.1-10.9_
  
  - [x] 6.8 编写Phase4单元测试
    - 测试章节生成流程
    - 测试修复循环逻辑
    - 测试状态更新
    - _Requirements: 4.9-4.19, 10.1-10.9_
  
  - [x] 6.9 实现Phase5全书校验
    - 在src/core/usecases/phase5FinalValidation.ts中实现phase5FinalValidation函数
    - 生成质量报告(统计、错误记录、AI调用统计)
    - _Requirements: 4.23, 4.24_
  
  - [x] 6.10 编写Phase5单元测试
    - 测试质量报告生成
    - 测试统计信息计算
    - _Requirements: 4.23, 4.24_

- [x] 7. 检查点 - Core层完成验证
  - 确保所有Core层单元测试通过
  - 确保测试覆盖率达到90%
  - 确认Core层无任何框架依赖(仅Zod、chalk)
  - 询问用户是否有问题或需要调整

- [x] 8. Adapter层实现
  - [x] 8.1 实现AI Adapter
    - 在src/adapters/aiAdapter.ts中实现OpenAICompatibleAdapter类
    - 实现AIPort接口的chat方法
    - 集成重试逻辑(指数退避)
    - 实现超时控制(30秒)
    - 实现错误分类(网络错误、API错误、限流错误)
    - _Requirements: 2.1-2.6, 12.4, 12.5_
  
  - [x] 8.2 编写AI Adapter集成测试
    - 测试真实API调用(可选,需要API Key)
    - 测试重试逻辑
    - 测试超时处理
    - _Requirements: 2.1-2.6_
  
  - [x] 8.3 实现Storage Adapter
    - 在src/adapters/storageAdapter.ts中实现FileSystemStorageAdapter类
    - 实现StoragePort接口的所有方法
    - 使用UTF-8编码
    - 实现原子写入
    - 集成路径安全检查
    - _Requirements: 15.1-15.8_
  
  - [x] 8.4 编写Storage Adapter集成测试
    - 测试文件读写
    - 测试路径遍历防护
    - 测试原子写入
    - _Requirements: 15.1-15.8_
  
  - [x] 8.5 实现Logger Adapter
    - 在src/adapters/loggerAdapter.ts中实现FileLoggerAdapter类
    - 实现LoggerPort接口的所有方法
    - 支持日志级别过滤
    - 实现日志脱敏(API Key等)
    - 实现结构化日志格式(JSON)
    - _Requirements: 11.1-11.12_
  
  - [x] 8.6 编写Logger Adapter集成测试
    - 测试日志写入
    - 测试日志级别过滤
    - 测试敏感信息脱敏
    - _Requirements: 11.1-11.12_
  
  - [x] 8.7 实现UI Adapter
    - 在src/adapters/uiAdapter.ts中实现ConsoleUIAdapter类
    - 实现UIPort接口的showProgress和showMessage方法
    - 使用chalk库实现彩色输出
    - _Requirements: 4.22_

- [x] 9. Bus层实现
  - [x] 9.1 定义Command类型
    - 在src/bus/commands.ts中定义所有Command类型
    - 定义INIT_PROJECT、TEST_AI_CONNECTION、GENERATE_FRAMEWORK、GENERATE_CHAPTERS、EXPORT_PROJECT
    - _Requirements: 1.1-1.7, 2.1-2.7, 3.1-3.16, 4.1-4.26, 5.1-5.14_
  
  - [x] 9.2 实现Effect Runner
    - 在src/bus/effectRunner.ts中实现runEffects和runEffect函数
    - 根据Effect类型调用对应的Adapter方法
    - 实现错误处理和日志记录
    - _Requirements: 8.4_
  
  - [x] 9.3 实现Dispatcher
    - 在src/bus/dispatcher.ts中实现dispatch函数
    - 路由Command到对应的handler
    - 调用Use Case函数并执行返回的Effects
    - 实现统一的错误处理
    - _Requirements: 8.4_
  
  - [x] 9.4 实现INIT_PROJECT handler
    - 在src/bus/handlers/initProject.ts中实现initProjectHandler函数
    - 创建config.yaml模板
    - 创建目录结构
    - 处理--force选项
    - _Requirements: 1.1-1.7_
  
  - [x] 9.5 实现TEST_AI_CONNECTION handler
    - 在src/bus/handlers/testAIConnection.ts中实现testAIConnectionHandler函数
    - 测试Main Model和JSON Model连接
    - 显示响应时间和连接状态
    - _Requirements: 2.1-2.7_
  
  - [x] 9.6 实现GENERATE_FRAMEWORK handler
    - 在src/bus/handlers/generateFramework.ts中实现generateFrameworkHandler函数
    - 编排Phase1→Phase2→Phase3的执行
    - 实现重试机制(最多3次)
    - 生成project.json元数据
    - _Requirements: 3.1-3.16_
  
  - [x] 9.7 实现GENERATE_CHAPTERS handler
    - 在src/bus/handlers/generateChapters.ts中实现generateChaptersHandler函数
    - 实现断点续传逻辑
    - 实现章节范围过滤(--volume、--range、--chapter)
    - 循环调用Phase4生成每章
    - 完成后调用Phase5生成报告
    - _Requirements: 4.1-4.26_
  
  - [x] 9.8 实现EXPORT_PROJECT handler
    - 在src/bus/handlers/exportProject.ts中实现exportProjectHandler函数
    - 合并所有章节为novel.md
    - 生成world.md、characters.md、outline.md、timeline.md、report.md
    - 支持markdown和json格式
    - _Requirements: 5.1-5.14_
  
  - [x] 9.9 编写Bus层集成测试
    - 使用mock adapter测试Dispatcher
    - 测试Effect Runner执行逻辑
    - 测试每个handler的命令处理
    - _Requirements: 8.4_

- [x] 10. 配置管理
  - [x] 10.1 定义配置Schema
    - 在src/config/schema.ts中使用Zod定义Config类型
    - 定义ai、generation、logging、summary配置节
    - _Requirements: 14.1-14.8_
  
  - [x] 10.2 实现配置加载器
    - 在src/config/loader.ts中实现loadConfig函数
    - 支持YAML格式解析
    - 支持环境变量替换(${VAR_NAME})
    - 实现配置校验和默认值填充
    - _Requirements: 14.1-14.8_
  
  - [x] 10.3 定义默认配置
    - 在src/config/defaults.ts中定义defaultConfig常量
    - _Requirements: 14.6_
  
  - [x] 10.4 编写配置加载器单元测试
    - 测试YAML解析
    - 测试环境变量替换
    - 测试配置校验
    - _Requirements: 14.1-14.8_

- [x] 11. Shell层 - AppContext构建器
  - [x] 11.1 实现AppContext构建器
    - 在src/shells/contextBuilder.ts中实现buildAppContext函数
    - 实例化所有Adapter
    - 加载配置文件
    - 返回完整的AppContext对象
    - _Requirements: 8.8_

- [x] 12. Shell层 - CLI实现
  - [x] 12.1 实现CLI主程序
    - 在src/shells/cli/index.ts中使用Commander.js实现CLI
    - 定义init、test、framework、chapters、export命令
    - 每个命令处理器限制在10行以内
    - 解析参数→构建Command→调用dispatch→格式化输出
    - _Requirements: 1.1-1.7, 2.1-2.7, 3.1-3.16, 4.1-4.26, 5.1-5.14, 7.1-7.6, 8.6_
  
  - [x] 12.2 编写CLI冒烟测试
    - 测试命令解析
    - 测试参数验证
    - _Requirements: 1.1-1.7_

- [x] 13. 检查点 - 核心功能验证
  - 运行完整的端到端测试(init→framework→chapters→export)
  - 验证生成的小说质量
  - 验证断点续传功能
  - 验证修复循环功能
  - 询问用户是否有问题或需要调整

- [x] 14. Shell层 - TUI实现
  - [x] 14.1 实现TUI主程序
    - 在src/shells/tui/index.ts中使用@inquirer/prompts实现TUI
    - 实现主菜单和各功能的交互式界面
    - 实时显示进度和状态信息
    - _Requirements: 6.1-6.13, 17.1-17.10_
  
  - [x] 14.2 编写TUI冒烟测试
    - 测试菜单导航
    - 测试输入验证
    - _Requirements: 6.1-6.13_

- [ ] 15. 端到端测试
  - [x] 15.1 编写完整工作流E2E测试
    - 测试从init到export的完整流程
    - 使用真实的AI API(需要API Key)
    - 验证生成的文件结构和内容
    - _Requirements: 1.1-1.7, 2.1-2.7, 3.1-3.16, 4.1-4.26, 5.1-5.14_
  
  - [x] 15.2 编写断点续传E2E测试
    - 测试中断后恢复生成
    - 验证不重复生成已完成章节
    - _Requirements: 4.3, 4.25_
  
  - [ ] 15.3 编写错误恢复E2E测试
    - 测试网络错误重试
    - 测试API限流处理
    - 测试修复循环
    - _Requirements: 10.1-10.9, 12.4, 12.5_

- [x] 16. 文档和发布准备
  - [x] 16.1 编写README.md
    - 项目介绍
    - 安装说明
    - 快速开始
    - 命令参考
    - 配置说明
  
  - [x] 16.2 编写CONTRIBUTING.md
    - 开发环境搭建
    - 代码规范
    - 测试要求
    - PR流程
  
  - [x] 16.3 添加示例配置文件
    - 创建config.example.yaml
    - 添加详细注释
  
  - [x] 16.4 配置package.json scripts
    - 添加build、test、lint、dev脚本
    - 配置bin字段指向CLI入口

- [x] 17. 最终检查点
  - 确保所有测试通过
  - 确保测试覆盖率达标(Core 90%、Bus 80%、Adapter 70%)
  - 运行完整的E2E测试
  - 验证在Windows、macOS、Linux上的兼容性
  - 询问用户是否准备发布

## Notes

- 任务标记`*`为可选任务,可跳过以加快MVP开发
- 每个任务明确引用需求编号,确保可追溯性
- 检查点任务确保增量验证,及时发现问题
- Core层测试覆盖率目标90%,确保业务逻辑正确性
- 优先实现核心生成流程(Phase1-5),次要功能(TUI、导出)后置
