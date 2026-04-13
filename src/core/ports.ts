/**
 * Port接口定义
 * Port是Core层定义的接口,由Adapter层实现
 * 实现依赖倒置原则,Core层不依赖具体实现
 */

/**
 * AI服务Port
 */
export interface AIPort {
  chat(options: ChatOptions): Promise<ChatResponse>;
}

export interface ChatOptions {
  model: 'main' | 'json';
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 存储服务Port
 */
export interface StoragePort {
  saveFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  listDir(path: string): Promise<string[]>;
}

/**
 * 日志服务Port
 */
export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
  saveAIConversation(logPath: string, conversation: AIConversation): Promise<void>;
}

export interface AIConversation {
  timestamp: string;
  model: 'main' | 'json';
  messages: Message[];
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * UI服务Port
 */
export interface UIPort {
  showProgress(current: number, total: number, message: string): void;
  showMessage(type: 'info' | 'success' | 'warning' | 'error', message: string): void;
}
