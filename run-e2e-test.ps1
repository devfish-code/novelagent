# NovelAgent E2E测试脚本
# 用于运行完整的端到端测试

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NovelAgent E2E 测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否提供了API Key
if (-not $env:NOVELAGENT_TEST_API_KEY) {
    Write-Host "❌ 错误: 未设置 NOVELAGENT_TEST_API_KEY 环境变量" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先设置API Key:" -ForegroundColor Yellow
    Write-Host '  $env:NOVELAGENT_TEST_API_KEY="your-api-key-here"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "可选配置:" -ForegroundColor Yellow
    Write-Host '  $env:NOVELAGENT_TEST_BASE_URL="https://api.openai.com/v1"' -ForegroundColor Gray
    Write-Host '  $env:NOVELAGENT_TEST_MODEL="gpt-3.5-turbo"' -ForegroundColor Gray
    Write-Host '  $env:NOVELAGENT_KEEP_TEST_DIR="true"  # 保留测试目录用于调试' -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# 显示配置信息
Write-Host "📋 测试配置:" -ForegroundColor Green
Write-Host "  API Key: $($env:NOVELAGENT_TEST_API_KEY.Substring(0, [Math]::Min(10, $env:NOVELAGENT_TEST_API_KEY.Length)))..." -ForegroundColor Gray

if ($env:NOVELAGENT_TEST_BASE_URL) {
    Write-Host "  Base URL: $env:NOVELAGENT_TEST_BASE_URL" -ForegroundColor Gray
} else {
    Write-Host "  Base URL: https://api.openai.com/v1 (默认)" -ForegroundColor Gray
}

if ($env:NOVELAGENT_TEST_MODEL) {
    Write-Host "  Model: $env:NOVELAGENT_TEST_MODEL" -ForegroundColor Gray
} else {
    Write-Host "  Model: gpt-3.5-turbo (默认)" -ForegroundColor Gray
}

if ($env:NOVELAGENT_KEEP_TEST_DIR -eq "true") {
    Write-Host "  保留测试目录: 是" -ForegroundColor Gray
} else {
    Write-Host "  保留测试目录: 否" -ForegroundColor Gray
}

Write-Host ""
Write-Host "⏱️  预计耗时: 15-20分钟" -ForegroundColor Yellow
Write-Host "💰 预计成本: $0.50-$1.00 (使用gpt-3.5-turbo)" -ForegroundColor Yellow
Write-Host ""

# 询问确认
$confirmation = Read-Host "是否继续运行E2E测试? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ 测试已取消" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 开始运行E2E测试..." -ForegroundColor Green
Write-Host ""

# 运行测试
npm test -- tests/e2e/complete-workflow.test.ts

# 检查测试结果
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ E2E测试通过!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    if ($env:NOVELAGENT_KEEP_TEST_DIR -eq "true") {
        Write-Host "📦 测试目录已保留,请查看临时目录中的 novelagent-e2e-* 文件夹" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ E2E测试失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 提示:" -ForegroundColor Yellow
    Write-Host "  1. 检查API Key是否正确" -ForegroundColor Gray
    Write-Host "  2. 检查网络连接" -ForegroundColor Gray
    Write-Host "  3. 检查API配额是否充足" -ForegroundColor Gray
    Write-Host "  4. 查看日志文件获取详细错误信息" -ForegroundColor Gray
    Write-Host ""
    
    if ($env:NOVELAGENT_KEEP_TEST_DIR -ne "true") {
        Write-Host "💡 建议设置 `$env:NOVELAGENT_KEEP_TEST_DIR=`"true`" 以保留测试目录用于调试" -ForegroundColor Yellow
    }
    
    exit 1
}
