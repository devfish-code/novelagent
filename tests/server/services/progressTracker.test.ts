import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressTracker } from '../../../src/server/services/progressTracker.js';
import { TaskManager } from '../../../src/server/services/taskManager.js';
import { EventBroadcaster } from '../../../src/server/websocket/broadcaster.js';
import { AppError, ErrorCodes } from '../../../src/server/middleware/errorHandler.js';

describe('ProgressTracker', () => {
  let taskManager: TaskManager;
  let broadcaster: EventBroadcaster;
  let progressTracker: ProgressTracker;

  beforeEach(() => {
    taskManager = new TaskManager();
    
    // Mock EventBroadcaster
    broadcaster = {
      broadcastProgress: vi.fn(),
      broadcastStatus: vi.fn(),
      broadcastComplete: vi.fn(),
      broadcastError: vi.fn(),
    } as unknown as EventBroadcaster;

    progressTracker = new ProgressTracker(taskManager, broadcaster);
  });

  describe('updateProgress', () => {
    it('should update task progress and broadcast', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);

      progressTracker.updateProgress(
        task.id,
        { phase: 1, percentage: 50, current: 5, total: 10 },
        'Processing...',
        { step: 'requirements' }
      );

      // Verify task was updated
      const updated = taskManager.getTask(task.id);
      expect(updated?.progress).toEqual({
        phase: 1,
        percentage: 50,
        current: 5,
        total: 10,
      });

      // Verify broadcast was called
      expect(broadcaster.broadcastProgress).toHaveBeenCalledWith('test-project', {
        projectName: 'test-project',
        timestamp: expect.any(String),
        phase: 1,
        percentage: 50,
        current: 5,
        total: 10,
        message: 'Processing...',
        details: { step: 'requirements' },
      });
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        progressTracker.updateProgress(
          'non-existent-id',
          { percentage: 50 },
          'Processing...'
        );
      }).toThrow(AppError);
    });
  });

  describe('broadcastStatus', () => {
    it('should broadcast status change', () => {
      const task = taskManager.createTask('test-project', 'framework');

      progressTracker.broadcastStatus(task.id, 'running', 1);

      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith('test-project', {
        projectName: 'test-project',
        timestamp: expect.any(String),
        status: 'generating',
        phase: 1,
      });
    });

    it('should map task status to WebSocket status correctly', () => {
      const task = taskManager.createTask('test-project', 'framework');

      // Test pending -> idle
      progressTracker.broadcastStatus(task.id, 'pending');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'idle' })
      );

      // Test running -> generating
      progressTracker.broadcastStatus(task.id, 'running');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'generating' })
      );

      // Test paused -> paused
      progressTracker.broadcastStatus(task.id, 'paused');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'paused' })
      );

      // Test completed -> completed
      progressTracker.broadcastStatus(task.id, 'completed');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'completed' })
      );

      // Test failed -> failed
      progressTracker.broadcastStatus(task.id, 'failed');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'failed' })
      );

      // Test cancelled -> failed
      progressTracker.broadcastStatus(task.id, 'cancelled');
      expect(broadcaster.broadcastStatus).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        progressTracker.broadcastStatus('non-existent-id', 'running');
      }).toThrow(AppError);
    });
  });

  describe('broadcastComplete', () => {
    it('should broadcast completion event', () => {
      const task = taskManager.createTask('test-project', 'framework');

      const result = {
        success: true,
        summary: 'Framework generated successfully',
        data: { files: 5 },
      };

      progressTracker.broadcastComplete(task.id, 3, result);

      expect(broadcaster.broadcastComplete).toHaveBeenCalledWith('test-project', {
        projectName: 'test-project',
        timestamp: expect.any(String),
        phase: 3,
        result,
      });
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        progressTracker.broadcastComplete('non-existent-id', 3, {
          success: true,
          summary: 'Done',
        });
      }).toThrow(AppError);
    });
  });

  describe('broadcastError', () => {
    it('should broadcast error event', () => {
      const task = taskManager.createTask('test-project', 'framework');

      const error = {
        code: ErrorCodes.AI_CONNECTION_FAILED,
        message: 'AI connection failed',
        details: { reason: 'timeout' },
      };

      progressTracker.broadcastError(task.id, error);

      expect(broadcaster.broadcastError).toHaveBeenCalledWith('test-project', {
        projectName: 'test-project',
        timestamp: expect.any(String),
        error: {
          code: ErrorCodes.AI_CONNECTION_FAILED,
          message: 'AI connection failed',
          details: { reason: 'timeout' },
        },
      });
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        progressTracker.broadcastError('non-existent-id', {
          code: 'ERROR',
          message: 'Error',
        });
      }).toThrow(AppError);
    });

    it('should throw error if error object is not provided', () => {
      const task = taskManager.createTask('test-project', 'framework');

      expect(() => {
        progressTracker.broadcastError(task.id, undefined as any);
      }).toThrow(AppError);
    });
  });
});
