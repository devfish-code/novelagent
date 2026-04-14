/**
 * useWebSocket Hook
 * WebSocket 连接管理和消息处理
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ClientMessage,
  ServerMessage,
  WebSocketStatus,
} from '../types';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: ServerMessage) => void;
  onConnect?: (clientId: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  connect: () => void;
  disconnect: () => void;
  subscribe: (projectName: string) => void;
  unsubscribe: (projectName: string) => void;
  sendMessage: (message: ClientMessage) => void;
  isConnected: boolean;
}

const DEFAULT_WS_URL = `ws://${window.location.hostname}:${window.location.port || 3001}`;
const DEFAULT_RECONNECT_INTERVAL = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = DEFAULT_WS_URL,
    autoConnect = true,
    reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>({
    state: 'disconnected',
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedProjectsRef = useRef<Set<string>>(new Set());

  // 发送消息
  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }, []);

  // 订阅项目
  const subscribe = useCallback((projectName: string) => {
    subscribedProjectsRef.current.add(projectName);
    sendMessage({ type: 'subscribe', projectName });
  }, [sendMessage]);

  // 取消订阅项目
  const unsubscribe = useCallback((projectName: string) => {
    subscribedProjectsRef.current.delete(projectName);
    sendMessage({ type: 'unsubscribe', projectName });
  }, [sendMessage]);

  // 重新订阅所有项目（重连后）
  const resubscribeAll = useCallback(() => {
    subscribedProjectsRef.current.forEach((projectName) => {
      sendMessage({ type: 'subscribe', projectName });
    });
  }, [sendMessage]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus((prev) => ({ ...prev, state: 'connecting' }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setStatus({
          state: 'connected',
          reconnectAttempts: 0,
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          
          // 处理连接确认消息
          if (message.type === 'connected') {
            setStatus((prev) => ({
              ...prev,
              clientId: message.clientId,
            }));
            onConnect?.(message.clientId);
            
            // 重新订阅所有项目
            resubscribeAll();
          }
          
          // 调用消息处理回调
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus((prev) => ({
          ...prev,
          state: 'error',
          error: 'WebSocket connection error',
        }));
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus((prev) => ({ ...prev, state: 'disconnected' }));
        onDisconnect?.();

        // 尝试重连
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setStatus((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, reconnectInterval);
        } else {
          console.error('Max reconnect attempts reached');
          setStatus((prev) => ({
            ...prev,
            error: 'Failed to reconnect after maximum attempts',
          }));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus((prev) => ({
        ...prev,
        state: 'error',
        error: 'Failed to create WebSocket connection',
      }));
    }
  }, [url, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage, resubscribeAll]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    setStatus({
      state: 'disconnected',
      reconnectAttempts: 0,
    });
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // 心跳检测
  useEffect(() => {
    if (status.state !== 'connected') {
      return;
    }

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // 每 30 秒发送一次心跳

    return () => {
      clearInterval(pingInterval);
    };
  }, [status.state, sendMessage]);

  return {
    status,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    isConnected: status.state === 'connected',
  };
};
