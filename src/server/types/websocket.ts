/**
 * WebSocket Message Types
 * Defines all message types for client-server WebSocket communication
 */

// Client → Server Messages
export type ClientMessage =
  | { type: 'subscribe'; projectName: string }
  | { type: 'unsubscribe'; projectName: string }
  | { type: 'cancel'; projectName: string; taskId: string }
  | { type: 'ping' };

// Server → Client Messages
export type ServerMessage =
  | { type: 'connected'; clientId: string }
  | { type: 'pong' }
  | ProgressEvent
  | LogEvent
  | StatusEvent
  | ErrorEvent
  | CompleteEvent;

export interface ProgressEvent {
  type: 'progress';
  projectName: string;
  timestamp: string;
  phase: 1 | 2 | 3 | 4 | 5;
  percentage: number;
  current: number;
  total: number;
  message: string;
  details?: {
    volume?: number;
    chapter?: number;
    step?: string;
  };
}

export interface LogEvent {
  type: 'log';
  projectName: string;
  timestamp: string;
  level: 'info' | 'debug' | 'warning' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export interface StatusEvent {
  type: 'status';
  projectName: string;
  timestamp: string;
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'paused';
  phase?: 1 | 2 | 3 | 4 | 5;
}

export interface ErrorEvent {
  type: 'error';
  projectName: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface CompleteEvent {
  type: 'complete';
  projectName: string;
  timestamp: string;
  phase: 1 | 2 | 3 | 4 | 5;
  result: {
    success: boolean;
    summary: string;
    data?: unknown;
  };
}
