/**
 * WebSocket Types
 * WebSocket 消息类型定义
 */

// ============================================================================
// Client Messages (发送到服务器)
// ============================================================================

export type ClientMessage = 
  | PingMessage
  | SubscribeMessage
  | UnsubscribeMessage;

export interface PingMessage {
  type: 'ping';
}

export interface SubscribeMessage {
  type: 'subscribe';
  projectName: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  projectName: string;
}

// ============================================================================
// Server Messages (从服务器接收)
// ============================================================================

export type ServerMessage =
  | ConnectedMessage
  | PongMessage
  | ProgressMessage
  | LogMessage
  | StatusMessage
  | ErrorMessage
  | CompleteMessage;

export interface ConnectedMessage {
  type: 'connected';
  clientId: string;
  timestamp: string;
}

export interface PongMessage {
  type: 'pong';
  timestamp: string;
}

export interface ProgressMessage {
  type: 'progress';
  projectName: string;
  timestamp: string;
  phase: number;
  percentage: number;
  current: number;
  total: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface LogMessage {
  type: 'log';
  projectName: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export interface StatusMessage {
  type: 'status';
  projectName: string;
  timestamp: string;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed';
  phase?: number;
}

export interface ErrorMessage {
  type: 'error';
  projectName: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface CompleteMessage {
  type: 'complete';
  projectName: string;
  timestamp: string;
  phase: number;
  result: {
    success: boolean;
    summary: string;
    data?: Record<string, unknown>;
  };
}

// ============================================================================
// WebSocket Connection State
// ============================================================================

export type WebSocketState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface WebSocketStatus {
  state: WebSocketState;
  clientId?: string;
  error?: string;
  reconnectAttempts: number;
}
