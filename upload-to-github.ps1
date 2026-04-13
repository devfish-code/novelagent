# NovelAgent GitHub上传脚本 (Windows PowerShell)
# 此脚本将帮助你快速上传项目到GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NovelAgent GitHub 上传向导" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Git是否已安装
Write-Host "检查Git安装..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✓ Git已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git未安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装Git:" -ForegroundColor Yellow
    Write-Host "  访问 https://git-scm.com/ 下载安装" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# 检查是否已初始化Git仓库
if (Test-Path .git) {
    Write-Host "✓ Git仓库已初始化" -ForegroundColor Green
} else {
    Write-Host "初始化Git仓库..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git仓库初始化完成" -ForegroundColor Green
}

Write-Host ""

# 检查Git配置
Write-Host "检查Git配置..." -ForegroundColor Yellow
$userName = git config user.name
$userEmail = git config user.email

if (-not $userName -or -not $userEmail) {
    Write-Host "需要配置Git用户信息" -ForegroundColor Yellow
    Write-Host ""
    
    $userName = Read-Host "请输入你的GitHub用户名"
    $userEmail = Read-Host "请输入你的GitHub邮箱"
    
    git config --global user.name "$userName"
    git config --global user.email "$userEmail"
    
    Write-Host "✓ Git配置完成" -ForegroundColor Green
} else {
    Write-Host "✓ Git已配置: $userName <$userEmail>" -ForegroundColor Green
}

Write-Host ""

# 检查是否有未提交的更改
Write-Host "检查文件状态..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "发现未提交的文件" -ForegroundColor Yellow
    Write-Host ""
    
    # 显示文件列表
    Write-Host "将要提交的文件:" -ForegroundColor Cyan
    git status --short
    Write-Host ""
    
    $confirm = Read-Host "是否提交这些文件? (y/n)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "操作已取消" -ForegroundColor Red
        exit 0
    }
    
    # 添加所有文件
    Write-Host ""
    Write-Host "添加文件到Git..." -ForegroundColor Yellow
    git add .
    
    # 提交
    Write-Host "提交文件..." -ForegroundColor Yellow
    git commit -m "Initial commit - NovelAgent v0.1.0

- 实现五阶段工作流
- 实现九项校验规则
- 完整的CLI和TUI界面
- 完整的测试套件
- 测试覆盖率: Core 98.66%, Adapter 78.36%
- 314个测试全部通过"
    
    Write-Host "✓ 文件提交完成" -ForegroundColor Green
} else {
    Write-Host "✓ 没有未提交的更改" -ForegroundColor Green
}

Write-Host ""

# 检查是否已配置远程仓库
$remoteUrl = git remote get-url origin 2>$null

if ($remoteUrl) {
    Write-Host "✓ 远程仓库已配置: $remoteUrl" -ForegroundColor Green
    Write-Host ""
    
    $pushConfirm = Read-Host "是否推送到远程仓库? (y/n)"
    if ($pushConfirm -eq 'y' -or $pushConfirm -eq 'Y') {
        Write-Host ""
        Write-Host "推送到GitHub..." -ForegroundColor Yellow
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "✓ 上传成功!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "访问你的仓库: $remoteUrl" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "✗ 推送失败" -ForegroundColor Red
            Write-Host ""
            Write-Host "可能的原因:" -ForegroundColor Yellow
            Write-Host "  1. 需要认证 - 使用Personal Access Token" -ForegroundColor Gray
            Write-Host "  2. 网络问题" -ForegroundColor Gray
            Write-Host "  3. 远程仓库不存在" -ForegroundColor Gray
            Write-Host ""
            Write-Host "请查看 GITHUB-UPLOAD-GUIDE.md 获取详细帮助" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "需要配置远程仓库" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请先在GitHub上创建仓库:" -ForegroundColor Cyan
    Write-Host "  1. 访问 https://github.com/new" -ForegroundColor Gray
    Write-Host "  2. Repository name: novelagent" -ForegroundColor Gray
    Write-Host "  3. Description: AI驱动的长篇小说自动生成CLI工具" -ForegroundColor Gray
    Write-Host "  4. 选择 Public 或 Private" -ForegroundColor Gray
    Write-Host "  5. 不要勾选 'Initialize this repository with a README'" -ForegroundColor Gray
    Write-Host "  6. 点击 'Create repository'" -ForegroundColor Gray
    Write-Host ""
    
    $repoUrl = Read-Host "请输入GitHub仓库URL (例: https://github.com/username/novelagent.git)"
    
    if ($repoUrl) {
        Write-Host ""
        Write-Host "添加远程仓库..." -ForegroundColor Yellow
        git remote add origin $repoUrl
        
        Write-Host "重命名分支为main..." -ForegroundColor Yellow
        git branch -M main
        
        Write-Host "推送到GitHub..." -ForegroundColor Yellow
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "✓ 上传成功!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "访问你的仓库: $repoUrl" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "下一步:" -ForegroundColor Yellow
            Write-Host "  1. 添加仓库描述和标签" -ForegroundColor Gray
            Write-Host "  2. 创建Release (可选)" -ForegroundColor Gray
            Write-Host "  3. 邀请协作者 (可选)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "详细说明请查看 GITHUB-UPLOAD-GUIDE.md" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "✗ 推送失败" -ForegroundColor Red
            Write-Host ""
            Write-Host "如果提示需要认证:" -ForegroundColor Yellow
            Write-Host "  1. 访问 https://github.com/settings/tokens" -ForegroundColor Gray
            Write-Host "  2. 生成Personal Access Token" -ForegroundColor Gray
            Write-Host "  3. 推送时使用token作为密码" -ForegroundColor Gray
            Write-Host ""
            Write-Host "详细说明请查看 GITHUB-UPLOAD-GUIDE.md" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
