import { randomUUID } from 'crypto';
import { AppError, ErrorCodes } from '../middleware/errorHandler.js';

/**
 * Task interface
 * Represents a background task (framework generation, chapter generation, export)
 */
export interface Task {
  id: string;
  projectName: string;
  type: 'framework' | 'chapters' | 'export';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    phase: number;
    percentage: number;
    current: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * TaskManager
 * Manages the lifecycle of background tasks
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private runningTasks: Map<string, AbortController> = new Map();

  /**
   * Create a new task
   */
  createTask(projectName: string, type: Task['type']): Task {
    const task: Task = {
      id: randomUUID(),
      projectName,
      type,
      status: 'pending',
      createdAt: new Date(),
      progress: {
        phase: 0,
        percentage: 0,
        current: 0,
        total: 0,
      },
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a project
   */
  getProjectTasks(projectName: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectName === projectName
    );
  }

  /**
   * Get the running task for a project (if any)
   */
  getRunningTask(projectName: string): Task | undefined {
    return Array.from(this.tasks.values()).find(
      (task) => task.projectName === projectName && task.status === 'running'
    );
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: Partial<Task['progress']>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    task.progress = {
      ...task.progress,
      ...progress,
    };
  }

  /**
   * Start a task
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Check if another task is already running for this project
    const runningTask = this.getRunningTask(task.projectName);
    if (runningTask && runningTask.id !== taskId) {
      throw new AppError(
        ErrorCodes.TASK_ALREADY_RUNNING,
        `Another task is already running for project ${task.projectName}`,
        { runningTaskId: runningTask.id }
      );
    }

    // Only pending or paused tasks can be started
    if (task.status !== 'pending' && task.status !== 'paused') {
      throw new AppError(
        ErrorCodes.TASK_CANNOT_PAUSE,
        `Cannot start task in ${task.status} status`
      );
    }

    task.status = 'running';
    if (!task.startedAt) {
      task.startedAt = new Date();
    }
  }

  /**
   * Pause a task
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Only running tasks can be paused
    if (task.status !== 'running') {
      throw new AppError(
        ErrorCodes.TASK_CANNOT_PAUSE,
        `Cannot pause task in ${task.status} status`
      );
    }

    task.status = 'paused';
  }

  /**
   * Resume a paused task
   */
  resumeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Only paused tasks can be resumed
    if (task.status !== 'paused') {
      throw new AppError(
        ErrorCodes.TASK_CANNOT_PAUSE,
        `Cannot resume task in ${task.status} status`
      );
    }

    task.status = 'running';
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    // Only pending, running, or paused tasks can be cancelled
    if (
      task.status !== 'pending' &&
      task.status !== 'running' &&
      task.status !== 'paused'
    ) {
      throw new AppError(
        ErrorCodes.TASK_CANNOT_CANCEL,
        `Cannot cancel task in ${task.status} status`
      );
    }

    task.status = 'cancelled';
    task.completedAt = new Date();

    // Abort the task if it has an AbortController
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    task.status = 'completed';
    task.completedAt = new Date();

    // Clean up AbortController
    this.runningTasks.delete(taskId);
  }

  /**
   * Mark a task as failed
   */
  failTask(taskId: string, error: Task['error']): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new AppError(ErrorCodes.TASK_NOT_FOUND, `Task ${taskId} not found`);
    }

    task.status = 'failed';
    task.completedAt = new Date();
    task.error = error;

    // Clean up AbortController
    this.runningTasks.delete(taskId);
  }

  /**
   * Get the AbortController for a task
   */
  getAbortController(taskId: string): AbortController | undefined {
    return this.runningTasks.get(taskId);
  }

  /**
   * Set the AbortController for a task
   */
  setAbortController(taskId: string, controller: AbortController): void {
    this.runningTasks.set(taskId, controller);
  }
}
