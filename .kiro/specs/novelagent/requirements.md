# Requirements Document - NovelAgent

## Introduction

NovelAgent是一个AI驱动的长篇小说自动生成CLI工具。通过五阶段工作流(需求理解→世界构建→大纲规划→逐章生成→全书校验)和九项校验规则,实现一键生成高质量长篇小说,解决AI写作中的一致性问题(角色设定漂移、伏笔遗忘、时间线混乱等)。

系统采用Core-Shell三层架构:
- Core层: 纯业务逻辑,包含五阶段工作流、九项校验规则、领域模型
- Bus层: 命令分发和副作用执行
- Shell层: CLI和TUI适配层

技术栈: TypeScript 5.0+ + Node.js 20+, Commander.js (CLI), @inquirer/prompts (TUI), Zod (类型校验), fs-extra (文件操作), Vitest (测试)

## Glossary

- **NovelAgent_System**: 整个AI长篇小说自动生成系统
- **CLI_Shell**: 命令行界面适配层,使用Commander.js实现
- **TUI_Shell**: 文本用户界面适配层,使用@inquirer/prompts实现
- **Command_Bus**: 命令分发层,负责调度use case和执行effects
- **Core_Layer**: 纯逻辑层,包含所有业务逻辑
- **Effect**: 副作用声明,描述需要执行的I/O操作
- **Use_Case**: 业务用例函数,返回Effect声明而不直接执行I/O
- **Project_Directory**: 用户指定的工作目录,包含config.yaml和小说项目
- **Novel_Project**: 具体的小说项目目录,包含world/、outline/、chapters/等子目录
- **Config_File**: config.yaml配置文件,包含AI模型配置和生成参数
- **World_State**: 世界状态数据库,包含角色、地点、规则、时间线、伏笔等信息
- **Phase1**: 需求理解阶段,分析创意描述生成结构化需求
- **Phase2**: 世界构建阶段,生成世界观、角色档案、地点档案、规则体系
- **Phase3**: 大纲规划阶段,生成三层大纲(全书→卷→章)
- **Phase4**: 逐章生成阶段,生成章节正文并进行九项校验和修复
- **Phase5**: 全书校验阶段,进行全书一致性扫描和质量报告生成
- **Nine_Validations**: 九项校验规则(世界规则、时空、信息逻辑、角色行为、能力、物品状态、伏笔、常识背景、叙事逻辑)
- **Fix_Loop**: 修复循环,校验失败时自动生成修复方案并重新校验
- **Main_Model**: 主AI模型,负责创意生成、大纲规划、正文写作
- **JSON_Model**: JSON模型,负责结构化数据提取和校验
- **Checkpoint_Resume**: 断点续传,从上次中断处继续生成
- **AI_Adapter**: AI适配器,实现OpenAI兼容API调用
- **Storage_Adapter**: 存储适配器,实现本地文件系统操作
- **Logger_Adapter**: 日志适配器,实现文件日志记录
- **Port**: 接口定义,在Core层定义,在Adapter层实现
- **Validation_Result**: 校验结果,包含是否通过和违规列表
- **Violation**: 违规项,包含类型、严重程度、消息、位置、建议修复方案
- **Requirements_Document**: requirements.md文件,包含小说类型、目标读者、核心冲突、主题、情感基调等结构化需求
- **Project_Metadata**: project.json文件,包含项目名、创建时间、配置参数、生成进度、章节元数据等
- **Chapter_Summary**: 章节摘要,提取关键事件、角色动作、状态变化的精简版本
- **Context_Assembly**: 上下文组装过程,按优先级选择和组合大纲、角色档案、前文内容、世界状态等信息
- **Generation_Report**: report.md文件,包含章节数、字数统计、校验错误记录、生成时间、AI调用统计等

## Requirements

### Requirement 1: 项目初始化

**User Story:** 作为用户,我希望运行init命令后自动生成配置文件模板和项目目录结构,以便快速开始小说创作。

#### Acceptance Criteria

1. WHEN用户执行init命令, THE NovelAgent_System SHALL在Project_Directory创建config.yaml文件
2. WHEN用户执行init命令, THE NovelAgent_System SHALL创建必要的子目录(logs/、world/、outline/、chapters/、exports/)
3. WHEN Config_File已存在且用户未指定--force选项, THE NovelAgent_System SHALL显示错误提示并终止操作
4. WHEN用户指定--force选项, THE NovelAgent_System SHALL覆盖已存在的Config_File
5. WHEN用户指定--dir选项, THE NovelAgent_System SHALL在指定目录执行初始化操作
6. WHEN Project_Directory无写入权限, THE NovelAgent_System SHALL显示权限错误并终止操作
7. WHEN初始化成功, THE NovelAgent_System SHALL显示配置文件路径和下一步操作提示

### Requirement 2: AI连接测试

**User Story:** 作为用户,我希望在正式生成前测试AI连接,确保配置正确。

#### Acceptance Criteria

1. WHEN用户执行test命令, THE NovelAgent_System SHALL读取Config_File中的AI模型配置
2. WHEN用户未指定--model选项或指定为all, THE NovelAgent_System SHALL测试Main_Model和JSON_Model的连接
3. WHEN用户指定--model为main, THE NovelAgent_System SHALL仅测试Main_Model的连接
4. WHEN用户指定--model为json, THE NovelAgent_System SHALL仅测试JSON_Model的连接
5. WHEN AI模型连接成功, THE NovelAgent_System SHALL显示响应时间和连接状态
6. WHEN AI模型连接失败, THE NovelAgent_System SHALL显示详细错误信息(API Key错误、网络问题、超时等)
7. WHEN Config_File不存在, THE NovelAgent_System SHALL提示用户先执行init命令

### Requirement 3: 生成小说框架

**User Story:** 作为用户,我希望输入一句话创意,系统自动生成完整的小说框架,包含详细的设定和三层大纲。

#### Acceptance Criteria

1. WHEN用户执行framework命令, THE NovelAgent_System SHALL执行Phase1生成结构化需求文档
2. WHEN Phase1完成, THE NovelAgent_System SHALL执行Phase2生成世界观、角色档案、地点档案、规则体系
3. WHEN Phase2完成, THE NovelAgent_System SHALL执行Phase3生成三层大纲(全书→卷→章)
4. WHEN用户未指定--name选项, THE NovelAgent_System SHALL显示错误提示并终止操作
5. WHEN Novel_Project目录已存在, THE NovelAgent_System SHALL显示错误提示并终止操作
6. WHEN用户指定--volumes选项, THE NovelAgent_System SHALL使用指定的卷数覆盖Config_File默认值
7. WHEN用户指定--chapters-per-volume选项, THE NovelAgent_System SHALL使用指定的每卷章数覆盖Config_File默认值
8. WHEN用户指定--words-per-chapter选项, THE NovelAgent_System SHALL使用指定的每章字数覆盖Config_File默认值
9. WHEN创意描述少于10个字符, THE NovelAgent_System SHALL显示警告提示描述可能不够详细
10. WHEN Phase2完成, THE NovelAgent_System SHALL生成至少5个核心角色的详细档案
11. WHEN Phase3完成, THE NovelAgent_System SHALL在outline/目录生成novel.yaml、volume-*.yaml和chapters/目录下的章级大纲
12. WHEN任一阶段AI生成失败, THE NovelAgent_System SHALL重试最多3次
13. WHEN重试3次仍失败, THE NovelAgent_System SHALL显示错误信息并保留日志
14. WHEN framework命令成功完成, THE NovelAgent_System SHALL在Novel_Project目录生成project.json元数据文件
15. WHEN Phase1完成, THE NovelAgent_System SHALL在Novel_Project目录生成requirements.md文件
16. THE requirements.md SHALL包含小说类型、目标读者、核心冲突、主题、情感基调字段

### Requirement 4: 生成章节

**User Story:** 作为用户,我希望系统根据大纲自动生成所有章节,并确保内容前后一致,发现问题自动修复。

#### Acceptance Criteria

1. WHEN用户执行chapters命令, THE NovelAgent_System SHALL加载Novel_Project的配置和大纲
2. WHEN Novel_Project不存在, THE NovelAgent_System SHALL提示用户先执行framework命令
3. WHEN用户未指定章节范围, THE NovelAgent_System SHALL检查已生成章节并从上次中断处继续(Checkpoint_Resume)
4. WHEN用户指定--volume选项, THE NovelAgent_System SHALL仅生成指定卷的章节
5. WHEN用户指定--range选项, THE NovelAgent_System SHALL仅生成指定范围的章节
6. WHEN用户指定--chapter选项, THE NovelAgent_System SHALL仅生成指定章节
7. WHEN章节文件已存在且用户未指定--force选项, THE NovelAgent_System SHALL跳过该章节
8. WHEN用户指定--force选项, THE NovelAgent_System SHALL重新生成已存在的章节
9. FOR ALL待生成章节, THE NovelAgent_System SHALL按顺序执行Phase4生成流程
10. WHEN生成单章, THE NovelAgent_System SHALL组装上下文(大纲、角色档案、前文摘要、世界状态)
11. WHEN上下文组装完成, THE NovelAgent_System SHALL调用Main_Model生成章节初稿
12. WHEN章节初稿生成完成, THE NovelAgent_System SHALL调用JSON_Model提取并更新World_State
13. WHEN World_State更新完成, THE NovelAgent_System SHALL并行执行Nine_Validations
14. WHEN任一校验失败, THE NovelAgent_System SHALL进入Fix_Loop生成修复方案
15. WHEN Fix_Loop执行, THE NovelAgent_System SHALL调用Main_Model生成修复后的章节
16. WHEN修复后章节生成, THE NovelAgent_System SHALL重新执行Nine_Validations
17. WHEN Fix_Loop执行次数达到配置的最大值且仍有校验失败, THE NovelAgent_System SHALL记录错误并继续下一章
18. WHEN所有校验通过, THE NovelAgent_System SHALL调用Main_Model进行风格润色
19. WHEN章节完成, THE NovelAgent_System SHALL保存章节文件到chapters/目录
20. WHEN章节保存完成, THE NovelAgent_System SHALL更新project.json元数据
21. WHEN章节保存完成, THE NovelAgent_System SHALL记录详细日志到logs/目录
22. WHEN生成过程中, THE NovelAgent_System SHALL显示进度(当前章/总章数)
23. WHEN所有章节生成完成, THE NovelAgent_System SHALL执行Phase5全书校验
24. WHEN Phase5完成, THE NovelAgent_System SHALL生成report.md质量报告
25. WHEN网络中断, THE NovelAgent_System SHALL保存当前进度以支持Checkpoint_Resume
26. WHEN API限流, THE NovelAgent_System SHALL使用指数退避策略自动重试

### Requirement 5: 导出产物

**User Story:** 作为用户,我希望将生成的小说导出为便于阅读和发布的格式。

#### Acceptance Criteria

1. WHEN用户执行export命令, THE NovelAgent_System SHALL加载Novel_Project
2. WHEN Novel_Project不存在, THE NovelAgent_System SHALL显示错误提示并终止操作
3. WHEN用户未指定--format选项, THE NovelAgent_System SHALL使用markdown格式导出
4. WHEN用户指定--format为markdown, THE NovelAgent_System SHALL导出.md格式文件
5. WHEN用户指定--format为json, THE NovelAgent_System SHALL导出.json格式文件
6. WHEN用户未指定--output选项, THE NovelAgent_System SHALL导出到exports/目录
7. WHEN用户指定--output选项, THE NovelAgent_System SHALL导出到指定目录
8. WHEN导出执行, THE NovelAgent_System SHALL合并所有章节为novel.md完整小说文件
9. WHEN导出执行, THE NovelAgent_System SHALL生成world.md世界观文档汇总
10. WHEN导出执行, THE NovelAgent_System SHALL生成characters.md角色档案汇总
11. WHEN导出执行, THE NovelAgent_System SHALL生成outline.md大纲文档
12. WHEN导出执行, THE NovelAgent_System SHALL生成timeline.md时间线文档
13. WHEN导出执行, THE NovelAgent_System SHALL生成report.md生成报告(统计、质量分析、错误记录)
14. WHEN导出完成, THE NovelAgent_System SHALL显示导出文件列表和路径

### Requirement 6: TUI交互界面

**User Story:** 作为写作爱好者,我希望有一个交互式界面引导我完成整个创作流程。

#### Acceptance Criteria

1. WHEN用户执行novelagent命令且未提供任何参数, THE NovelAgent_System SHALL启动TUI_Shell
2. WHEN TUI_Shell启动, THE NovelAgent_System SHALL显示欢迎信息和主菜单
3. WHEN TUI_Shell显示主菜单, THE NovelAgent_System SHALL提供选项: 初始化新项目、测试AI连接、生成小说框架、生成章节、导出产物、查看生成报告、退出
4. WHEN用户选择初始化新项目, THE TUI_Shell SHALL提示输入工作目录和是否强制覆盖
5. WHEN用户选择测试AI连接, THE TUI_Shell SHALL提示选择测试的模型类型
6. WHEN用户选择生成小说框架, THE TUI_Shell SHALL提示输入创意描述、项目名、卷数、每卷章数、每章字数
7. WHEN用户选择生成章节, THE TUI_Shell SHALL提示输入项目名、卷号、章节范围
8. WHEN用户选择导出产物, THE TUI_Shell SHALL提示输入项目名、导出格式、输出目录
9. WHEN用户选择查看生成报告, THE TUI_Shell SHALL显示项目列表供选择
10. WHEN用户选择项目, THE TUI_Shell SHALL显示该项目的完整生成报告
11. WHEN用户选择退出, THE TUI_Shell SHALL终止程序
12. WHEN TUI_Shell执行操作, THE NovelAgent_System SHALL实时显示进度和状态信息
13. WHEN TUI_Shell执行操作完成, THE NovelAgent_System SHALL显示结果摘要并返回主菜单

### Requirement 7: 工作目录指定

**User Story:** 作为程序员创作者,我希望能够指定任意工作目录,以便将NovelAgent集成到我的工作流中。

#### Acceptance Criteria

1. FOR ALL CLI命令, THE NovelAgent_System SHALL支持--dir选项指定Project_Directory
2. WHEN用户未指定--dir选项, THE NovelAgent_System SHALL使用当前工作目录作为Project_Directory
3. WHEN用户指定--dir选项, THE NovelAgent_System SHALL使用指定路径作为Project_Directory
4. WHEN指定的Project_Directory不存在, THE NovelAgent_System SHALL尝试创建该目录
5. WHEN无法创建Project_Directory, THE NovelAgent_System SHALL显示错误提示并终止操作
6. WHEN Project_Directory路径包含非法字符, THE NovelAgent_System SHALL显示清晰的错误提示

### Requirement 8: Core-Shell架构约束

**User Story:** 作为开发者,我希望系统遵循Core-Shell架构原则,确保业务逻辑与框架分离,便于测试和维护。

#### Acceptance Criteria

1. THE Core_Layer SHALL NOT导入Commander.js、@inquirer/prompts或任何Shell框架
2. THE Core_Layer SHALL仅依赖Zod和chalk库
3. FOR ALL Use_Case函数, THE Core_Layer SHALL返回Effect声明而不直接执行I/O操作
4. THE Command_Bus SHALL负责执行所有Effect声明
5. THE CLI_Shell和TUI_Shell SHALL仅负责解析输入、构建Command、调用dispatch、格式化输出
6. FOR ALL Shell处理器函数, THE NovelAgent_System SHALL限制代码行数在10行以内
7. THE Core_Layer SHALL定义所有Port接口
8. THE AI_Adapter、Storage_Adapter、Logger_Adapter SHALL实现Core_Layer定义的Port接口
9. THE Command_Bus SHALL通过Port接口调用Adapter实现

### Requirement 9: 九项校验规则

**User Story:** 作为用户,我希望系统自动检测章节中的一致性问题,确保小说质量。

#### Acceptance Criteria

1. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行世界规则校验
2. WHEN执行世界规则校验, THE NovelAgent_System SHALL检测章节内容是否违反World_State中定义的世界规则
3. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行时空校验
4. WHEN执行时空校验, THE NovelAgent_System SHALL检测角色是否能在该时间出现在该地点
5. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行信息逻辑校验
6. WHEN执行信息逻辑校验, THE NovelAgent_System SHALL检测角色是否使用了不该知道的信息
7. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行角色行为校验
8. WHEN执行角色行为校验, THE NovelAgent_System SHALL检测行为是否符合角色性格档案和当前动机
9. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行能力校验
10. WHEN执行能力校验, THE NovelAgent_System SHALL检测角色展示的能力是否在能力范围内
11. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行物品状态校验
12. WHEN执行物品状态校验, THE NovelAgent_System SHALL检测角色使用的物品是否确实持有
13. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行伏笔校验
14. WHEN执行伏笔校验, THE NovelAgent_System SHALL检测计划埋设或回收的伏笔是否完成
15. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行常识背景校验
16. WHEN执行常识背景校验, THE NovelAgent_System SHALL检测是否出现与世界背景不符的事物
17. WHEN执行Phase4章节生成, THE NovelAgent_System SHALL对每章执行叙事逻辑校验
18. WHEN执行叙事逻辑校验, THE NovelAgent_System SHALL检测大纲功能是否完成且因果链是否清晰
19. FOR ALL Nine_Validations, THE NovelAgent_System SHALL并行执行以提高效率
20. WHEN任一校验检测到违规, THE NovelAgent_System SHALL生成Validation_Result包含Violation列表
21. FOR ALL Violation, THE NovelAgent_System SHALL包含类型、严重程度、消息、位置、建议修复方案

### Requirement 10: 强制修复机制

**User Story:** 作为用户,我希望系统发现问题后自动修复,而不是交付错误内容。

#### Acceptance Criteria

1. WHEN Nine_Validations检测到Violation, THE NovelAgent_System SHALL进入Fix_Loop
2. WHEN进入Fix_Loop, THE NovelAgent_System SHALL将Violation列表和原章节内容发送给Main_Model
3. WHEN Main_Model收到修复请求, THE NovelAgent_System SHALL生成修复后的章节内容
4. WHEN修复后章节生成, THE NovelAgent_System SHALL重新执行Nine_Validations
5. WHEN重新校验仍有Violation, THE NovelAgent_System SHALL再次进入Fix_Loop
6. WHEN Fix_Loop执行次数达到Config_File中配置的最大值, THE NovelAgent_System SHALL记录错误到logs/目录
7. WHEN Fix_Loop达到最大次数, THE NovelAgent_System SHALL继续生成下一章而不终止整个流程
8. WHEN Fix_Loop成功修复所有Violation, THE NovelAgent_System SHALL继续风格润色步骤
9. WHEN Fix_Loop执行, THE NovelAgent_System SHALL记录每轮修复的prompt和response到logs/ai-conversations/目录

### Requirement 11: 日志和可追溯性

**User Story:** 作为用户,我希望系统记录详细的生成日志,便于调试和分析。

#### Acceptance Criteria

1. WHEN NovelAgent_System执行任何操作, THE Logger_Adapter SHALL记录日志到logs/novel-generation.log
2. WHEN NovelAgent_System调用AI模型, THE Logger_Adapter SHALL保存完整的prompt和response到logs/ai-conversations/目录
3. WHEN执行Phase1, THE Logger_Adapter SHALL保存对话到logs/ai-conversations/phase1-requirements.json
4. WHEN执行Phase2, THE Logger_Adapter SHALL保存对话到logs/ai-conversations/phase2-world-building.json
5. WHEN执行Phase3, THE Logger_Adapter SHALL保存对话到logs/ai-conversations/phase3-outline/目录
6. WHEN执行Phase4生成单章, THE Logger_Adapter SHALL保存对话到logs/ai-conversations/phase4-chapters/{章节ID}/目录
7. WHEN执行Fix_Loop, THE Logger_Adapter SHALL保存每轮修复对话到logs/ai-conversations/phase4-chapters/{章节ID}/fix-round-{轮次}.json
8. WHEN执行Nine_Validations, THE Logger_Adapter SHALL保存校验结果到logs/validation-reports/目录
9. WHEN发生错误, THE Logger_Adapter SHALL记录错误堆栈和上下文信息
10. WHEN Config_File中logLevel设置为debug, THE Logger_Adapter SHALL记录所有debug级别日志
11. WHEN Config_File中logLevel设置为info, THE Logger_Adapter SHALL仅记录info和error级别日志
12. WHEN Config_File中logLevel设置为error, THE Logger_Adapter SHALL仅记录error级别日志

### Requirement 12: 性能要求

**User Story:** 作为用户,我希望系统在合理时间内完成生成任务。

#### Acceptance Criteria

1. WHEN组装上下文, THE NovelAgent_System SHALL在1秒内完成
2. WHEN执行Nine_Validations, THE NovelAgent_System SHALL在5秒内完成
3. WHEN NovelAgent_System运行, THE NovelAgent_System SHALL保持内存占用峰值低于500MB
4. WHEN AI模型响应超时, THE NovelAgent_System SHALL在30秒后终止请求并重试
5. WHEN网络请求失败, THE NovelAgent_System SHALL使用指数退避策略重试(1秒、2秒、4秒、8秒)

### Requirement 13: 错误处理

**User Story:** 作为用户,我希望系统在遇到错误时给出清晰的提示和恢复建议。

#### Acceptance Criteria

1. WHEN Config_File不存在, THE NovelAgent_System SHALL显示错误码CONFIG_NOT_FOUND和提示信息
2. WHEN Config_File格式无效, THE NovelAgent_System SHALL显示错误码CONFIG_INVALID和具体的格式错误位置
3. WHEN AI连接失败, THE NovelAgent_System SHALL显示错误码AI_CONNECTION_FAILED和详细的失败原因
4. WHEN AI响应格式无效, THE NovelAgent_System SHALL显示错误码AI_RESPONSE_INVALID和响应内容
5. WHEN遇到API限流, THE NovelAgent_System SHALL显示错误码AI_RATE_LIMITED和建议的等待时间
6. WHEN Novel_Project已存在, THE NovelAgent_System SHALL显示错误码PROJECT_EXISTS和建议使用--force选项
7. WHEN Novel_Project不存在, THE NovelAgent_System SHALL显示错误码PROJECT_NOT_FOUND和建议先执行framework命令
8. WHEN文件不存在, THE NovelAgent_System SHALL显示错误码FILE_NOT_FOUND和文件路径
9. WHEN文件访问被拒绝, THE NovelAgent_System SHALL显示错误码FILE_ACCESS_DENIED和权限提示
10. FOR ALL错误, THE NovelAgent_System SHALL返回包含code、message、details的错误对象
11. FOR ALL错误, THE NovelAgent_System SHALL记录完整的错误堆栈到日志文件

### Requirement 14: 配置文件规范

**User Story:** 作为用户,我希望通过配置文件灵活控制生成参数。

#### Acceptance Criteria

1. THE Config_File SHALL使用YAML格式
2. THE Config_File SHALL包含ai.mainModel配置节,定义Main_Model的provider、baseURL、apiKey、model、temperature、maxTokens
3. THE Config_File SHALL包含ai.jsonModel配置节,定义JSON_Model的provider、baseURL、apiKey、model、temperature、maxTokens
4. THE Config_File SHALL包含generation配置节,定义volumes、chaptersPerVolume、wordsPerChapter、maxFixRounds
5. THE Config_File SHALL包含logging配置节,定义logLevel、logDir
6. WHEN Config_File中缺少必需字段, THE NovelAgent_System SHALL使用默认值并显示警告
7. WHEN Config_File中字段类型错误, THE NovelAgent_System SHALL显示错误并终止操作
8. WHEN用户通过CLI选项指定参数, THE NovelAgent_System SHALL使用CLI参数覆盖Config_File中的值

### Requirement 15: 数据持久化

**User Story:** 作为用户,我希望系统可靠地保存所有生成的数据,避免丢失。

#### Acceptance Criteria

1. WHEN生成任何文件, THE Storage_Adapter SHALL确保目标目录存在
2. WHEN保存文件, THE Storage_Adapter SHALL使用UTF-8编码
3. WHEN保存章节, THE NovelAgent_System SHALL立即写入磁盘而不缓存
4. WHEN更新project.json, THE NovelAgent_System SHALL使用原子写入避免损坏
5. WHEN保存YAML文件, THE NovelAgent_System SHALL使用2空格缩进格式化
6. WHEN保存JSON文件, THE NovelAgent_System SHALL使用2空格缩进格式化
7. WHEN保存Markdown文件, THE NovelAgent_System SHALL使用Unix换行符(LF)
8. WHEN读取文件失败, THE Storage_Adapter SHALL抛出包含文件路径的错误

### Requirement 16: 兼容性

**User Story:** 作为用户,我希望系统能在不同平台和环境下正常运行。

#### Acceptance Criteria

1. THE NovelAgent_System SHALL支持Node.js 20及以上版本
2. THE NovelAgent_System SHALL支持Windows、macOS、Linux操作系统
3. THE NovelAgent_System SHALL支持所有OpenAI兼容API格式的服务商
4. THE NovelAgent_System SHALL使用ES Modules模块系统
5. WHEN在Windows系统运行, THE NovelAgent_System SHALL正确处理路径分隔符
6. WHEN在不同操作系统运行, THE NovelAgent_System SHALL使用跨平台的文件路径API
7. WHEN检测到Node.js版本低于20, THE NovelAgent_System SHALL显示错误提示并终止运行

### Requirement 17: 查看生成报告

**User Story:** 作为用户,我希望能查看已生成项目的质量报告和统计信息,以便了解生成结果和发现潜在问题。

#### Acceptance Criteria

1. WHEN用户通过TUI选择查看生成报告, THE TUI_Shell SHALL扫描Project_Directory并显示所有Novel_Project列表
2. WHEN用户选择特定Novel_Project, THE NovelAgent_System SHALL读取该项目的report.md文件
3. WHEN report.md不存在, THE NovelAgent_System SHALL提示用户该项目尚未完成章节生成
4. WHEN显示报告, THE NovelAgent_System SHALL展示章节数统计信息
5. WHEN显示报告, THE NovelAgent_System SHALL展示字数统计信息(总字数、平均每章字数)
6. WHEN显示报告, THE NovelAgent_System SHALL展示校验错误记录(错误类型、数量、位置)
7. WHEN显示报告, THE NovelAgent_System SHALL展示生成时间信息(开始时间、结束时间、总耗时)
8. WHEN显示报告, THE NovelAgent_System SHALL展示修复循环统计(总修复次数、平均每章修复次数、修复失败章节列表)
9. WHEN显示报告, THE NovelAgent_System SHALL展示AI调用统计(总调用次数、总token消耗)
10. WHEN用户查看完报告, THE TUI_Shell SHALL提供返回主菜单选项

### Requirement 18: Phase1需求理解详细规范

**User Story:** 作为开发者,我希望明确Phase1应生成的requirements.md内容结构,确保需求文档包含所有必要信息。

#### Acceptance Criteria

1. WHEN执行Phase1, THE NovelAgent_System SHALL分析创意描述并生成小说类型字段
2. WHEN执行Phase1, THE NovelAgent_System SHALL生成目标读者字段(年龄段、阅读偏好)
3. WHEN执行Phase1, THE NovelAgent_System SHALL生成核心冲突字段(主要矛盾、对立双方)
4. WHEN执行Phase1, THE NovelAgent_System SHALL生成主题字段(核心思想、价值观)
5. WHEN执行Phase1, THE NovelAgent_System SHALL生成情感基调字段(整体氛围、情绪走向)
6. WHEN执行Phase1, THE NovelAgent_System SHALL生成故事背景字段(时代、地域、社会环境)
7. WHEN执行Phase1, THE NovelAgent_System SHALL生成叙事视角字段(第一人称/第三人称、全知/限知)
8. WHEN执行Phase1, THE NovelAgent_System SHALL生成预期篇幅字段(总字数、章节数)
9. WHEN执行Phase1, THE NovelAgent_System SHALL生成核心卖点字段(吸引读者的独特元素)
10. THE requirements.md SHALL使用YAML格式存储结构化数据
11. THE requirements.md SHALL包含metadata节(生成时间、NovelAgent版本)
12. WHEN requirements.md生成完成, THE NovelAgent_System SHALL保存到Novel_Project根目录

### Requirement 19: 项目元数据结构定义

**User Story:** 作为开发者,我希望明确project.json的完整数据结构,确保项目元数据的一致性和完整性。

#### Acceptance Criteria

1. THE project.json SHALL包含projectName字段(项目名称)
2. THE project.json SHALL包含createdAt字段(创建时间,ISO 8601格式)
3. THE project.json SHALL包含updatedAt字段(最后更新时间,ISO 8601格式)
4. THE project.json SHALL包含version字段(NovelAgent版本号)
5. THE project.json SHALL包含config节,包含volumes、chaptersPerVolume、wordsPerChapter字段
6. THE project.json SHALL包含progress节,包含currentPhase、completedChapters、totalChapters字段
7. THE project.json SHALL包含chapters数组,每个元素包含volume、chapter、title、wordCount、status、generatedAt字段
8. THE project.json SHALL包含statistics节,包含totalWords、totalAICalls、totalTokens、totalFixRounds字段
9. THE project.json SHALL包含status字段,取值为draft、generating、completed、failed之一
10. WHEN创建Novel_Project, THE NovelAgent_System SHALL生成初始project.json文件
11. WHEN更新project.json, THE NovelAgent_System SHALL更新updatedAt字段为当前时间
12. WHEN章节生成完成, THE NovelAgent_System SHALL更新chapters数组和statistics节
13. WHEN所有章节生成完成, THE NovelAgent_System SHALL将status字段更新为completed

### Requirement 20: 世界状态数据库规范

**User Story:** 作为开发者,我希望明确World_State的数据结构和更新机制,确保世界状态的准确追踪。

#### Acceptance Criteria

1. THE World_State SHALL包含characters节,存储所有角色的当前状态
2. FOR ALL角色状态, THE World_State SHALL包含location、health、inventory、knownInfo、unknownInfo、emotion字段
3. THE World_State SHALL包含locations节,存储所有地点的当前状态
4. FOR ALL地点状态, THE World_State SHALL包含currentWeather、presentCharacters、recentEvents字段
5. THE World_State SHALL包含timeline节,按时间顺序记录所有重要事件
6. FOR ALL时间线事件, THE World_State SHALL包含timestamp、event、involvedCharacters、location字段
7. THE World_State SHALL包含hooks节,追踪所有伏笔的状态
8. FOR ALL伏笔, THE World_State SHALL包含id、description、plantedAt、status、resolvedAt字段
9. THE World_State SHALL包含worldRules节,存储世界规则及其当前状态
10. WHEN章节生成完成, THE NovelAgent_System SHALL调用JSON_Model提取状态变化
11. WHEN JSON_Model返回状态变化, THE NovelAgent_System SHALL更新World_State对应字段
12. WHEN更新World_State, THE NovelAgent_System SHALL保存到world/world-state.yaml文件
13. WHEN执行Nine_Validations, THE NovelAgent_System SHALL读取最新的World_State作为校验依据
14. THE World_State SHALL使用YAML格式存储以便人类阅读和手动修正

### Requirement 21: RAG上下文组装

**User Story:** 作为开发者,我希望明确上下文组装的策略和优先级,确保AI生成时获得最相关的信息。

#### Acceptance Criteria

1. WHEN组装上下文, THE NovelAgent_System SHALL包含当前章节的章级大纲
2. WHEN组装上下文, THE NovelAgent_System SHALL包含当前卷的卷大纲
3. WHEN组装上下文, THE NovelAgent_System SHALL包含全书大纲
4. WHEN组装上下文, THE NovelAgent_System SHALL包含当前章节涉及角色的完整档案
5. WHEN组装上下文, THE NovelAgent_System SHALL包含当前章节涉及地点的完整档案
6. WHEN组装上下文, THE NovelAgent_System SHALL包含前3章的完整内容(如果存在)
7. WHEN前文超过3章, THE NovelAgent_System SHALL包含前4-10章的摘要(如果存在)
8. WHEN组装上下文, THE NovelAgent_System SHALL包含当前World_State
9. WHEN组装上下文, THE NovelAgent_System SHALL包含当前章节需要埋设或回收的伏笔信息
10. WHEN组装上下文, THE NovelAgent_System SHALL按优先级排序: 章级大纲 > 角色档案 > 前3章内容 > 卷大纲 > World_State > 前文摘要 > 全书大纲
11. WHEN组装后的上下文超过模型上下文窗口的80%, THE NovelAgent_System SHALL按优先级从低到高裁剪内容
12. WHEN组装上下文完成, THE NovelAgent_System SHALL记录上下文大小和包含的组件到日志
13. WHEN组装上下文, THE NovelAgent_System SHALL在1秒内完成

### Requirement 22: 前文摘要管理

**User Story:** 作为开发者,我希望明确摘要生成策略,确保长篇小说生成时能有效利用前文信息。

#### Acceptance Criteria

1. WHEN章节生成完成, THE NovelAgent_System SHALL判断是否需要生成摘要
2. WHEN当前章节序号大于3, THE NovelAgent_System SHALL为该章节生成摘要
3. WHEN生成摘要, THE NovelAgent_System SHALL调用Main_Model提取关键事件、角色动作、状态变化
4. WHEN生成摘要, THE NovelAgent_System SHALL限制摘要长度为原文的10%-20%
5. WHEN生成摘要, THE NovelAgent_System SHALL保存到chapters/summaries/{章节ID}-summary.md文件
6. WHEN组装上下文需要前文摘要, THE NovelAgent_System SHALL读取chapters/summaries/目录下的摘要文件
7. WHEN摘要文件不存在, THE NovelAgent_System SHALL跳过该章节摘要
8. THE NovelAgent_System SHALL使用滑动窗口策略: 前3章完整内容 + 第4-10章摘要
9. WHEN当前章节序号大于10, THE NovelAgent_System SHALL仅包含第(当前-10)到(当前-4)章的摘要
10. WHEN生成摘要, THE NovelAgent_System SHALL记录摘要生成时间和原文长度到日志
11. WHEN Config_File中配置summaryLength, THE NovelAgent_System SHALL使用配置的摘要长度比例
12. WHEN摘要生成失败, THE NovelAgent_System SHALL记录警告并继续生成流程
