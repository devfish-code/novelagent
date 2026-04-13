#!/bin/bash
# NovelAgent E2E测试脚本 (Linux/macOS)
# 用于运行完整的端到端测试

echo "========================================"
echo "NovelAgent E2E 测试脚本"
echo "========================================"
echo ""

# 检查是否提供了API Key
if [ -z "$NOVELAGENT_TEST_API_KEY" ]; then
    echo "❌ 错误: 未设置 NOVELAGENT_TEST_API_KEY 环境变量"
    echo ""
    echo "请先设置API Key:"
    echo '  export NOVELAGENT_TEST_API_KEY="your-api-key-here"'
    echo ""
    echo "可选配置:"
    echo '  export NOVELAGENT_TEST_BASE_URL="https://api.openai.com/v1"'
    echo '  export NOVELAGENT_TEST_MODEL="gpt-3.5-turbo"'
    echo '  export NOVELAGENT_KEEP_TEST_DIR="true"  # 保留测试目录用于调试'
    echo ""
    exit 1
fi

# 显示配置信息
echo "📋 测试配置:"
echo "  API Key: ${NOVELAGENT_TEST_API_KEY:0:10}..."

if [ -n "$NOVELAGENT_TEST_BASE_URL" ]; then
    echo "  Base URL: $NOVELAGENT_TEST_BASE_URL"
else
    echo "  Base URL: https://api.openai.com/v1 (默认)"
fi

if [ -n "$NOVELAGENT_TEST_MODEL" ]; then
    echo "  Model: $NOVELAGENT_TEST_MODEL"
else
    echo "  Model: gpt-3.5-turbo (默认)"
fi

if [ "$NOVELAGENT_KEEP_TEST_DIR" = "true" ]; then
    echo "  保留测试目录: 是"
else
    echo "  保留测试目录: 否"
fi

echo ""
echo "⏱️  预计耗时: 15-20分钟"
echo "💰 预计成本: \$0.50-\$1.00 (使用gpt-3.5-turbo)"
echo ""

# 询问确认
read -p "是否继续运行E2E测试? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 测试已取消"
    exit 0
fi

echo ""
echo "🚀 开始运行E2E测试..."
echo ""

# 运行测试
npm test -- tests/e2e/complete-workflow.test.ts

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ E2E测试通过!"
    echo "========================================"
    echo ""
    
    if [ "$NOVELAGENT_KEEP_TEST_DIR" = "true" ]; then
        echo "📦 测试目录已保留,请查看临时目录中的 novelagent-e2e-* 文件夹"
    fi
else
    echo ""
    echo "========================================"
    echo "❌ E2E测试失败"
    echo "========================================"
    echo ""
    echo "💡 提示:"
    echo "  1. 检查API Key是否正确"
    echo "  2. 检查网络连接"
    echo "  3. 检查API配额是否充足"
    echo "  4. 查看日志文件获取详细错误信息"
    echo ""
    
    if [ "$NOVELAGENT_KEEP_TEST_DIR" != "true" ]; then
        echo "💡 建议设置 export NOVELAGENT_KEEP_TEST_DIR=\"true\" 以保留测试目录用于调试"
    fi
    
    exit 1
fi
