# Task Management Services

本目录包含任务管理和进度追踪的核心服务。

## 服务概览

### TaskManager

管理后台任务的生命周期，包括任务创建、状态转换、进度更新等。

**主要功能：**
- 创建任务（框架生成、章节生成、导出）
- 管理任务状态（pending, running, paused, completed, failed, cancelled）
- 支持任务取消（通过 AbortController）
- 防止同一项目同时运行多个任务

### ProgressTracker

追踪任务进度并通过 WebSocket 实时推送给客户端。

**主要功能：**
- 更新任务进度并广播
- 广播状态变化
- 广播任务完成事件
- 广播错误信息

## 使用示例

```typescript
import { TaskManager, ProgressTracker } from './services/index.js';
import { EventBroadcaster } from './websocket/broadcaster.js';

// 初始化服务
const taskManager = new TaskManager();
const broadcaster = new EventBroadcaster(wsServer);
const progressTracker = new ProgressTracker(taskManager, broadcaster);

// 1. 创建任务
const task = taskManager.createTask('my-project', 'framework');
console.log('Task created:', task.id);

// 2. 启动任务
taskManager.startTask(task.id);
progressTracker.broadcastStatus(task.id, 'running', 1);

// 3. 设置 AbortController（用于取消）
const controller = new AbortController();
taskManager.setAbortController(task.id, controller);

// 4. 更新进度
progressTracker.updateProgress(
  task.id,
  { phase: 1, percentage: 25, current: 1, total: 4 },
  '正在生成需求文档...',
  { step: 'requirements' }
);

// 5. 暂停任务
taskManager.pauseTask(task.id);
progressTracker.broadcastStatus(task.id, 'paused');

// 6. 恢复任务
taskManager.resumeTask(task.id);
progressTracker.broadcastStatus(task.id, 'running', 1);

// 7. 完成任务
taskManager.completeTask(task.id);
progressTracker.broadcastComplete(task.id, 3, {
  success: true,
  summary: '框架生成完成',
  data: { filesCreated: 5 }
});

// 8. 处理错误
try {
  // 某些操作...
} catch (error) {
  const taskError = {
    code: 'AI_CONNECTION_FAILED',
    message: 'AI 连接失败',
    details: { reason: error.message }
  };
  taskManager.failTask(task.id, taskError);
  progressTracker.broadcastError(task.id, taskError);
}

// 9. 取消任务
taskManager.cancelTask(task.id); // 会自动调用 controller.abort()
progressTracker.broadcastStatus(task.id, 'cancelled');
```

## 任务状态转换

```
pending → running → completed
    ↓        ↓         
    ↓     paused → running
    ↓        ↓
    ↓     cancelled
    ↓
  cancelled

任何状态 → failed
```

## 错误处理

所有方法在遇到错误时会抛出 `AppError`：

```typescript
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';

try {
  taskManager.startTask('non-existent-id');
} catch (error) {
  if (error instanceof AppError) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  }
}
```

## WebSocket 事件

ProgressTracker 会自动广播以下事件：

1. **progress** - 进度更新
2. **status** - 状态变化
3. **complete** - 任务完成
4. **error** - 错误信息

客户端订阅项目后会自动接收这些事件。
