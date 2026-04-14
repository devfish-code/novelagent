# NovelAgent Web Frontend

现代化的 Web 前端界面，用于 NovelAgent 项目管理和小说生成。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Ant Design** - UI 组件库
- **Zustand** - 状态管理
- **Axios** - HTTP 客户端
- **React Router** - 路由管理

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 目录结构

```
web/
├── src/
│   ├── pages/          # 页面组件
│   ├── components/     # 通用组件
│   ├── hooks/          # 自定义 Hooks
│   ├── services/       # API 服务
│   ├── store/          # 状态管理
│   ├── types/          # 类型定义
│   └── utils/          # 工具函数
├── public/             # 静态资源
└── index.html          # HTML 模板
```

## 开发服务器

开发服务器运行在 `http://localhost:5173`，并配置了代理：
- `/api` → `http://localhost:3001` (Backend API)
- `/ws` → `ws://localhost:3001` (WebSocket)
