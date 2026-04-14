import { EventBroadcaster } from '../websocket/broadcaster.js';
import { TaskManager, Task } from './taskManager.js';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';

/**
 * ProgressTracker
 * Tracks task progress and broadcasts updates via WebSocket
 */
export class ProgressTracker {
  constructor(
    private taskManager: TaskManager,
    private broadcaster: EventBroadcaster
  ) {}

  /**
   * Update progress and broadcast to clients
   */
  updateProgress(
    taskId: string,
    progress: Partial<Task['progress']>,
    message: string,
    details?: {
      volume?: number;
      chapter?: number;
      step?: string;
    }
  ): void {
    // Update task progress in TaskManager
    this.taskManager.updateTaskProgress(taskId, progress);

    // Get the updated task
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Broadcast progress event
    this.broadcaster.broadcastProgress(task.projectName, {
      projectName: task.projectName,
      timestamp: new Date().toISOString(),
      phase: task.progress.phase as 1 | 2 | 3 | 4 | 5,
      percentage: task.progress.percentage,
      current: task.progress.current,
      total: task.progress.total,
      message,
      details,
    });
  }

  /**
   * Broadcast status change
   */
  broadcastStatus(
    taskId: string,
    status: Task['status'],
    phase?: number
  ): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Map task status to WebSocket status
    const wsStatus = this.mapTaskStatusToWSStatus(status);

    this.broadcaster.broadcastStatus(task.projectName, {
      projectName: task.projectName,
      timestamp: new Date().toISOString(),
      status: wsStatus,
      phase: phase as 1 | 2 | 3 | 4 | 5 | undefined,
    });
  }

  /**
   * Broadcast task completion
   */
  broadcastComplete(
    taskId: string,
    phase: number,
    result: {
      success: boolean;
      summary: string;
      data?: unknown;
    }
  ): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    this.broadcaster.broadcastComplete(task.projectName, {
      projectName: task.projectName,
      timestamp: new Date().toISOString(),
      phase: phase as 1 | 2 | 3 | 4 | 5,
      result,
    });
  }

  /**
   * Broadcast error
   */
  broadcastError(taskId: string, error: Task['error']): void {
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    if (!error) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Error object is required for broadcastError'
      );
    }

    this.broadcaster.broadcastError(task.projectName, {
      projectName: task.projectName,
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  /**
   * Map task status to WebSocket status
   */
  private mapTaskStatusToWSStatus(
    status: Task['status']
  ): 'idle' | 'generating' | 'completed' | 'failed' | 'paused' {
    switch (status) {
      case 'pending':
        return 'idle';
      case 'running':
        return 'generating';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'idle';
    }
  }
}
