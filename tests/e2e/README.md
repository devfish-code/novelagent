# E2E Tests

端到端测试用于验证NovelAgent的完整工作流程。

## 测试覆盖

### complete-workflow.test.ts

测试从项目初始化到导出的完整流程:

1. **项目初始化** - 创建配置文件和目录结构
2. **AI连接测试** - 验证AI模型连接
3. **框架生成** - Phase1-3完整流程
4. **章节生成** - Phase4逐章生成
5. **断点续传** - 验证中断后继续生成
6. **产物导出** - 导出所有文件
7. **完整性验证** - 验证文件结构和内容

## 运行要求

### 必需环境变量

- `NOVELAGENT_TEST_API_KEY`: OpenAI兼容API的密钥

### 可选环境变量

- `NOVELAGENT_TEST_BASE_URL`: API基础URL (默认: `https://api.openai.com/v1`)
- `NOVELAGENT_TEST_MODEL`: 模型名称 (默认: `gpt-3.5-turbo`)
- `NOVELAGENT_KEEP_TEST_DIR`: 设置为 `true` 保留测试目录用于调试

## 运行方式

### 运行所有E2E测试

```bash
NOVELAGENT_TEST_API_KEY=your-api-key npm test -- tests/e2e/
```

### 运行特定测试

```bash
NOVELAGENT_TEST_API_KEY=your-api-key npm test -- tests/e2e/complete-workflow.test.ts
```

### 使用自定义API配置

```bash
NOVELAGENT_TEST_API_KEY=your-api-key \
NOVELAGENT_TEST_BASE_URL=https://your-api.com/v1 \
NOVELAGENT_TEST_MODEL=gpt-4 \
npm test -- tests/e2e/
```

### 保留测试目录用于调试

```bash
NOVELAGENT_TEST_API_KEY=your-api-key \
NOVELAGENT_KEEP_TEST_DIR=true \
npm test -- tests/e2e/complete-workflow.test.ts
```

测试完成后会显示测试目录路径,可以手动检查生成的文件。

## 测试时间

E2E测试需要调用真实的AI API,因此运行时间较长:

- **完整工作流测试**: 约15-20分钟
  - 框架生成: ~5分钟
  - 每章生成: ~3-5分钟
  - 其他步骤: ~1-2分钟

## 注意事项

1. **API费用**: E2E测试会产生实际的API调用费用
2. **网络依赖**: 需要稳定的网络连接
3. **超时设置**: 测试设置了较长的超时时间(5-10分钟)
4. **并发限制**: 建议单独运行E2E测试,避免与其他测试并发

## 跳过E2E测试

如果没有提供API Key,E2E测试会自动跳过:

```bash
npm test -- tests/e2e/
# 输出: ⚠️  Skipping E2E test: NOVELAGENT_TEST_API_KEY not provided
```

## CI/CD集成

在CI/CD环境中运行E2E测试:

```yaml
# GitHub Actions示例
- name: Run E2E Tests
  env:
    NOVELAGENT_TEST_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: npm test -- tests/e2e/
```

## 故障排查

### 测试超时

如果测试超时,可能原因:
- API响应慢
- 网络不稳定
- 模型生成时间过长

解决方案:
- 使用更快的模型(如gpt-3.5-turbo)
- 减少测试章节数量
- 增加超时时间

### API错误

如果遇到API错误:
- 检查API Key是否正确
- 检查API配额是否充足
- 检查网络连接

### 文件权限错误

如果遇到文件权限错误:
- 检查临时目录权限
- 确保有足够的磁盘空间

## 测试数据

E2E测试使用以下配置以加快测试速度:

- 卷数: 1
- 每卷章数: 3
- 每章字数: 1000

这样可以在合理时间内完成测试,同时验证完整流程。

## 扩展测试

可以创建额外的E2E测试用例:

- `断点续传.test.ts` - 专门测试中断恢复
- `错误恢复.test.ts` - 测试各种错误场景
- `大规模生成.test.ts` - 测试大型项目(多卷多章)
- `并发生成.test.ts` - 测试并发章节生成

参考 `complete-workflow.test.ts` 的结构创建新测试。
