import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBroadcaster } from '../../../src/server/websocket/broadcaster.js';
import type { WSServer } from '../../../src/server/websocket/server.js';

describe('EventBroadcaster', () => {
  let mockWSServer: WSServer;
  let broadcaster: EventBroadcaster;

  beforeEach(() => {
    mockWSServer = {
      broadcastToProject: vi.fn(),
      getClientCount: vi.fn().mockReturnValue(5),
      getSubscriberCount: vi.fn().mockReturnValue(2),
    } as any;

    broadcaster = new EventBroadcaster(mockWSServer);
  });

  it('should broadcast progress events', () => {
    const projectName = 'test-project';
    const event = {
      projectName,
      timestamp: '2024-01-01T00:00:00Z',
      phase: 1 as const,
      percentage: 50,
      current: 5,
      total: 10,
      message: 'Processing...',
    };

    broadcaster.broadcastProgress(projectName, event);

    expect(mockWSServer.broadcastToProject).toHaveBeenCalledWith(projectName, {
      type: 'progress',
      ...event,
    });
  });

  it('should broadcast log events', () => {
    const projectName = 'test-project';
    const event = {
      projectName,
      timestamp: '2024-01-01T00:00:00Z',
      level: 'info' as const,
      message: 'Test log message',
      context: { key: 'value' },
    };

    broadcaster.broadcastLog(projectName, event);

    expect(mockWSServer.broadcastToProject).toHaveBeenCalledWith(projectName, {
      type: 'log',
      ...event,
    });
  });

  it('should broadcast status events', () => {
    const projectName = 'test-project';
    const event = {
      projectName,
      timestamp: '2024-01-01T00:00:00Z',
      status: 'generating' as const,
      phase: 2 as const,
    };

    broadcaster.broadcastStatus(projectName, event);

    expect(mockWSServer.broadcastToProject).toHaveBeenCalledWith(projectName, {
      type: 'status',
      ...event,
    });
  });

  it('should broadcast error events', () => {
    const projectName = 'test-project';
    const event = {
      projectName,
      timestamp: '2024-01-01T00:00:00Z',
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { info: 'additional info' },
      },
    };

    broadcaster.broadcastError(projectName, event);

    expect(mockWSServer.broadcastToProject).toHaveBeenCalledWith(projectName, {
      type: 'error',
      ...event,
    });
  });

  it('should broadcast complete events', () => {
    const projectName = 'test-project';
    const event = {
      projectName,
      timestamp: '2024-01-01T00:00:00Z',
      phase: 5 as const,
      result: {
        success: true,
        summary: 'Task completed successfully',
        data: { chapters: 10 },
      },
    };

    broadcaster.broadcastComplete(projectName, event);

    expect(mockWSServer.broadcastToProject).toHaveBeenCalledWith(projectName, {
      type: 'complete',
      ...event,
    });
  });

  it('should get subscriber count', () => {
    const count = broadcaster.getSubscriberCount('test-project');
    expect(count).toBe(2);
    expect(mockWSServer.getSubscriberCount).toHaveBeenCalledWith('test-project');
  });

  it('should get client count', () => {
    const count = broadcaster.getClientCount();
    expect(count).toBe(5);
    expect(mockWSServer.getClientCount).toHaveBeenCalled();
  });
});
