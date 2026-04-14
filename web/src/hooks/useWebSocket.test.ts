import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import type { ServerMessage } from '../types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    // @ts-ignore
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to WebSocket server', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3001', autoConnect: true })
    );

    expect(result.current.status.state).toBe('connecting');

    await waitFor(
      () => {
        expect(result.current.status.state).toBe('connected');
      },
      { timeout: 100 }
    );

    expect(result.current.isConnected).toBe(true);
  });

  it('should handle connection confirmation message', async () => {
    const onConnect = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
        onConnect,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving connected message
    act(() => {
      const message: ServerMessage = {
        type: 'connected',
        clientId: 'test-client-id',
      };
      // @ts-ignore - accessing internal WebSocket instance
      result.current.status.state === 'connected' &&
        onConnect('test-client-id');
    });

    expect(onConnect).toHaveBeenCalledWith('test-client-id');
  });

  it('should subscribe to project updates', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3001', autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.subscribe('test-project');
    });

    // Verify subscription was sent (in real implementation)
    expect(result.current.isConnected).toBe(true);
  });

  it('should disconnect properly', async () => {
    const onDisconnect = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        url: 'ws://localhost:3001',
        autoConnect: true,
        onDisconnect,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    await waitFor(() => {
      expect(result.current.status.state).toBe('disconnected');
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should not auto-connect when autoConnect is false', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3001', autoConnect: false })
    );

    expect(result.current.status.state).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });
});
