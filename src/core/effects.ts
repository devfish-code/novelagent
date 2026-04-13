/**
 * Effect类型定义
 * Effect是副作用声明,描述需要执行的I/O操作
 * Core层只声明Effect,由Bus层统一执行
 */

/**
 * Effect类型常量
 */
export const EffectType = {
  AI_CHAT: 'AI_CHAT',
  SAVE_FILE: 'SAVE_FILE',
  READ_FILE: 'READ_FILE',
  ENSURE_DIR: 'ENSURE_DIR',
  LOG_INFO: 'LOG_INFO',
  LOG_DEBUG: 'LOG_DEBUG',
  LOG_ERROR: 'LOG_ERROR',
  SHOW_PROGRESS: 'SHOW_PROGRESS',
  SHOW_MESSAGE: 'SHOW_MESSAGE',
} as const;

export type Effect =
  | AIChat
  | SaveFile
  | ReadFile
  | EnsureDir
  | LogInfo
  | LogDebug
  | LogError
  | ShowProgress
  | ShowMessage;

/**
 * AI聊天Effect
 */
export interface AIChat {
  type: 'AI_CHAT';
  payload: {
    model: 'main' | 'json';
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 保存文件Effect
 */
export interface SaveFile {
  type: 'SAVE_FILE';
  payload: {
    path: string;
    content: string;
  };
}

/**
 * 读取文件Effect
 */
export interface ReadFile {
  type: 'READ_FILE';
  payload: {
    path: string;
  };
}

/**
 * 确保目录存在Effect
 */
export interface EnsureDir {
  type: 'ENSURE_DIR';
  payload: {
    path: string;
  };
}

/**
 * 记录Info级别日志Effect
 */
export interface LogInfo {
  type: 'LOG_INFO';
  payload: {
    message: string;
    context?: Record<string, unknown>;
  };
}

/**
 * 记录Debug级别日志Effect
 */
export interface LogDebug {
  type: 'LOG_DEBUG';
  payload: {
    message: string;
    context?: Record<string, unknown>;
  };
}

/**
 * 记录Error级别日志Effect
 */
export interface LogError {
  type: 'LOG_ERROR';
  payload: {
    message: string;
    error?: Error;
  };
}

/**
 * 显示进度Effect
 */
export interface ShowProgress {
  type: 'SHOW_PROGRESS';
  payload: {
    current: number;
    total: number;
    message: string;
  };
}

/**
 * 显示消息Effect
 */
export interface ShowMessage {
  type: 'SHOW_MESSAGE';
  payload: {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  };
}
