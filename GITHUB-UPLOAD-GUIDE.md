# NovelAgent 上传到 GitHub 指南

本指南将帮助你将NovelAgent项目上传到GitHub。

## 前提条件

1. ✅ 已安装Git
2. ✅ 拥有GitHub账号
3. ✅ 项目代码已准备就绪

## 方法一: 使用GitHub Desktop (推荐新手)

### 步骤1: 安装GitHub Desktop
1. 访问 https://desktop.github.com/
2. 下载并安装GitHub Desktop
3. 登录你的GitHub账号

### 步骤2: 创建仓库
1. 打开GitHub Desktop
2. 点击 `File` → `Add Local Repository`
3. 选择你的项目目录 (当前目录)
4. 如果提示"This directory does not appear to be a Git repository"，点击 `Create a repository`

### 步骤3: 配置仓库信息
- **Name**: novelagent
- **Description**: AI驱动的长篇小说自动生成CLI工具
- **Local Path**: (保持当前路径)
- **Initialize this repository with a README**: 取消勾选 (我们已有README)
- **Git Ignore**: Node
- **License**: MIT

点击 `Create Repository`

### 步骤4: 提交代码
1. 在GitHub Desktop中，你会看到所有文件变更
2. 在左下角输入提交信息:
   - **Summary**: `Initial commit - NovelAgent v0.1.0`
   - **Description**: 
     ```
     - 实现五阶段工作流
     - 实现九项校验规则
     - 完整的CLI和TUI界面
     - 完整的测试套件
     ```
3. 点击 `Commit to main`

### 步骤5: 发布到GitHub
1. 点击顶部的 `Publish repository`
2. 配置:
   - **Name**: novelagent
   - **Description**: AI驱动的长篇小说自动生成CLI工具
   - **Keep this code private**: 取消勾选 (公开仓库)
3. 点击 `Publish Repository`

完成！你的代码已经上传到GitHub了。

---

## 方法二: 使用命令行 (推荐有经验的用户)

### 步骤1: 检查Git是否已安装

```bash
git --version
```

如果未安装，请访问 https://git-scm.com/ 下载安装。

### 步骤2: 初始化Git仓库

```bash
# 进入项目目录
cd E:\桌面\软件\文思写作

# 初始化Git仓库
git init

# 配置用户信息 (如果还没配置)
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"
```

### 步骤3: 创建.gitignore文件

检查是否已有`.gitignore`文件:

```bash
# Windows PowerShell
Test-Path .gitignore

# 如果不存在，创建它
```

`.gitignore`内容应该包含:
```
# 依赖
node_modules/

# 构建产物
dist/

# 日志
logs/
*.log

# 测试覆盖率
coverage/

# 环境变量
.env
.env.local

# IDE
.vscode/
.idea/

# 操作系统
.DS_Store
Thumbs.db

# 临时文件
*.tmp
*.temp

# 测试生成的文件
test-output/
```

### 步骤4: 添加文件到Git

```bash
# 添加所有文件
git add .

# 查看状态
git status

# 提交
git commit -m "Initial commit - NovelAgent v0.1.0

- 实现五阶段工作流
- 实现九项校验规则
- 完整的CLI和TUI界面
- 完整的测试套件
- 测试覆盖率: Core 98.66%, Adapter 78.36%
- 314个测试全部通过"
```

### 步骤5: 在GitHub上创建仓库

1. 访问 https://github.com/new
2. 填写信息:
   - **Repository name**: `novelagent`
   - **Description**: `AI驱动的长篇小说自动生成CLI工具`
   - **Public** (公开) 或 **Private** (私有)
   - **不要**勾选 "Initialize this repository with a README" (我们已有)
3. 点击 `Create repository`

### 步骤6: 连接远程仓库并推送

GitHub会显示命令，复制并执行:

```bash
# 添加远程仓库 (替换为你的用户名)
git remote add origin https://github.com/你的用户名/novelagent.git

# 重命名分支为main (如果需要)
git branch -M main

# 推送代码
git push -u origin main
```

如果推送时需要认证:
- **用户名**: 你的GitHub用户名
- **密码**: 使用Personal Access Token (不是GitHub密码)

### 步骤7: 创建Personal Access Token (如果需要)

1. 访问 https://github.com/settings/tokens
2. 点击 `Generate new token` → `Generate new token (classic)`
3. 配置:
   - **Note**: `NovelAgent Upload`
   - **Expiration**: 选择过期时间
   - **Select scopes**: 勾选 `repo` (完整仓库访问)
4. 点击 `Generate token`
5. **复制token** (只显示一次！)
6. 在推送时使用这个token作为密码

---

## 方法三: 使用VS Code (如果你在用VS Code)

### 步骤1: 打开源代码管理
1. 点击左侧的源代码管理图标 (或按 `Ctrl+Shift+G`)
2. 点击 `Initialize Repository`

### 步骤2: 提交代码
1. 在"Message"框中输入: `Initial commit - NovelAgent v0.1.0`
2. 点击 ✓ (提交)

### 步骤3: 发布到GitHub
1. 点击 `Publish to GitHub`
2. 选择 `Publish to GitHub public repository`
3. 选择要包含的文件
4. 点击 `OK`

---

## 验证上传成功

访问你的GitHub仓库页面:
```
https://github.com/你的用户名/novelagent
```

你应该能看到:
- ✅ 所有源代码文件
- ✅ README.md 显示在首页
- ✅ LICENSE 文件
- ✅ 项目描述

---

## 后续操作

### 1. 添加仓库描述和标签

在GitHub仓库页面:
1. 点击右上角的 ⚙️ (Settings)
2. 或直接在仓库首页点击 `About` 旁边的 ⚙️
3. 填写:
   - **Description**: `AI驱动的长篇小说自动生成CLI工具`
   - **Website**: (如果有)
   - **Topics**: `ai`, `novel`, `writing`, `cli`, `typescript`, `openai`, `novel-generation`
4. 点击 `Save changes`

### 2. 添加徽章到README

在README.md顶部添加:

```markdown
# NovelAgent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

AI驱动的长篇小说自动生成CLI工具
```

### 3. 创建Release (可选)

1. 在GitHub仓库页面，点击右侧的 `Releases`
2. 点击 `Create a new release`
3. 填写:
   - **Tag version**: `v0.1.0`
   - **Release title**: `NovelAgent v0.1.0`
   - **Description**: 参考 `RELEASE-CHECKLIST.md` 中的发布说明模板
4. 点击 `Publish release`

### 4. 设置GitHub Pages (可选)

如果你想创建项目文档网站:
1. 进入仓库 Settings
2. 点击左侧 `Pages`
3. 在 `Source` 下选择 `main` 分支
4. 点击 `Save`

---

## 常见问题

### Q1: 推送时提示"Permission denied"

**A**: 需要配置SSH密钥或使用Personal Access Token。推荐使用HTTPS + Token方式。

### Q2: 文件太大无法推送

**A**: 检查是否误提交了`node_modules/`或`dist/`目录。确保`.gitignore`配置正确。

```bash
# 如果已经提交，从Git中移除
git rm -r --cached node_modules
git rm -r --cached dist
git commit -m "Remove ignored files"
```

### Q3: 如何更新已上传的代码？

**A**: 
```bash
# 修改代码后
git add .
git commit -m "描述你的修改"
git push
```

### Q4: 如何撤销最后一次提交？

**A**:
```bash
# 撤销提交但保留修改
git reset --soft HEAD~1

# 撤销提交并丢弃修改 (危险!)
git reset --hard HEAD~1
```

### Q5: 推送时速度很慢

**A**: 
- 检查网络连接
- 尝试使用代理
- 或使用GitHub Desktop (有时更快)

---

## 下一步

上传成功后，你可以:

1. ✅ 邀请协作者
2. ✅ 设置GitHub Actions CI/CD
3. ✅ 创建Issues模板
4. ✅ 添加CONTRIBUTING.md
5. ✅ 发布到npm (如果需要)

---

## 需要帮助？

- GitHub文档: https://docs.github.com/
- Git教程: https://git-scm.com/book/zh/v2
- GitHub Desktop文档: https://docs.github.com/en/desktop

---

**祝你上传顺利！** 🚀

如果遇到问题，可以查看GitHub的官方文档或在Issues中提问。
