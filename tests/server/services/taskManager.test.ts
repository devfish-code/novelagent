import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../../../src/server/services/taskManager.js';
import { AppError, ErrorCodes } from '../../../src/server/middleware/errorHandler.js';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe('createTask', () => {
    it('should create a new task with pending status', () => {
      const task = taskManager.createTask('test-project', 'framework');

      expect(task.id).toBeDefined();
      expect(task.projectName).toBe('test-project');
      expect(task.type).toBe('framework');
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.progress).toEqual({
        phase: 0,
        percentage: 0,
        current: 0,
        total: 0,
      });
    });

    it('should create tasks with unique IDs', () => {
      const task1 = taskManager.createTask('project1', 'framework');
      const task2 = taskManager.createTask('project2', 'chapters');

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('getTask', () => {
    it('should return task by ID', () => {
      const task = taskManager.createTask('test-project', 'framework');
      const retrieved = taskManager.getTask(task.id);

      expect(retrieved).toBe(task);
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = taskManager.getTask('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getProjectTasks', () => {
    it('should return all tasks for a project', () => {
      taskManager.createTask('project1', 'framework');
      taskManager.createTask('project1', 'chapters');
      taskManager.createTask('project2', 'export');

      const project1Tasks = taskManager.getProjectTasks('project1');
      expect(project1Tasks).toHaveLength(2);
      expect(project1Tasks.every((t) => t.projectName === 'project1')).toBe(true);
    });

    it('should return empty array for project with no tasks', () => {
      const tasks = taskManager.getProjectTasks('non-existent-project');
      expect(tasks).toEqual([]);
    });
  });

  describe('getRunningTask', () => {
    it('should return running task for a project', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);

      const runningTask = taskManager.getRunningTask('test-project');
      expect(runningTask).toBe(task);
      expect(runningTask?.status).toBe('running');
    });

    it('should return undefined if no task is running', () => {
      taskManager.createTask('test-project', 'framework');
      const runningTask = taskManager.getRunningTask('test-project');
      expect(runningTask).toBeUndefined();
    });
  });

  describe('updateTaskProgress', () => {
    it('should update task progress', () => {
      const task = taskManager.createTask('test-project', 'framework');
      
      taskManager.updateTaskProgress(task.id, {
        phase: 1,
        percentage: 50,
        current: 5,
        total: 10,
      });

      const updated = taskManager.getTask(task.id);
      expect(updated?.progress).toEqual({
        phase: 1,
        percentage: 50,
        current: 5,
        total: 10,
      });
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        taskManager.updateTaskProgress('non-existent-id', { percentage: 50 });
      }).toThrow(AppError);
    });
  });

  describe('startTask', () => {
    it('should start a pending task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('running');
      expect(updated?.startedAt).toBeInstanceOf(Date);
    });

    it('should resume a paused task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.pauseTask(task.id);
      taskManager.startTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('running');
    });

    it('should throw error if another task is already running', () => {
      const task1 = taskManager.createTask('test-project', 'framework');
      const task2 = taskManager.createTask('test-project', 'chapters');
      
      taskManager.startTask(task1.id);

      expect(() => {
        taskManager.startTask(task2.id);
      }).toThrow(AppError);
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        taskManager.startTask('non-existent-id');
      }).toThrow(AppError);
    });
  });

  describe('pauseTask', () => {
    it('should pause a running task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.pauseTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('paused');
    });

    it('should throw error if task is not running', () => {
      const task = taskManager.createTask('test-project', 'framework');

      expect(() => {
        taskManager.pauseTask(task.id);
      }).toThrow(AppError);
    });
  });

  describe('resumeTask', () => {
    it('should resume a paused task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.pauseTask(task.id);
      taskManager.resumeTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('running');
    });

    it('should throw error if task is not paused', () => {
      const task = taskManager.createTask('test-project', 'framework');

      expect(() => {
        taskManager.resumeTask(task.id);
      }).toThrow(AppError);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a running task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.cancelTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('cancelled');
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it('should abort task with AbortController', () => {
      const task = taskManager.createTask('test-project', 'framework');
      const controller = new AbortController();
      taskManager.setAbortController(task.id, controller);
      
      taskManager.startTask(task.id);
      taskManager.cancelTask(task.id);

      expect(controller.signal.aborted).toBe(true);
      expect(taskManager.getAbortController(task.id)).toBeUndefined();
    });

    it('should throw error if task cannot be cancelled', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.completeTask(task.id);

      expect(() => {
        taskManager.cancelTask(task.id);
      }).toThrow(AppError);
    });
  });

  describe('completeTask', () => {
    it('should complete a task', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      taskManager.completeTask(task.id);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it('should clean up AbortController', () => {
      const task = taskManager.createTask('test-project', 'framework');
      const controller = new AbortController();
      taskManager.setAbortController(task.id, controller);
      
      taskManager.completeTask(task.id);

      expect(taskManager.getAbortController(task.id)).toBeUndefined();
    });
  });

  describe('failTask', () => {
    it('should mark task as failed with error', () => {
      const task = taskManager.createTask('test-project', 'framework');
      taskManager.startTask(task.id);
      
      const error = {
        code: ErrorCodes.AI_CONNECTION_FAILED,
        message: 'AI connection failed',
        details: { reason: 'timeout' },
      };
      
      taskManager.failTask(task.id, error);

      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.completedAt).toBeInstanceOf(Date);
      expect(updated?.error).toEqual(error);
    });
  });

  describe('AbortController management', () => {
    it('should set and get AbortController', () => {
      const task = taskManager.createTask('test-project', 'framework');
      const controller = new AbortController();
      
      taskManager.setAbortController(task.id, controller);
      const retrieved = taskManager.getAbortController(task.id);

      expect(retrieved).toBe(controller);
    });

    it('should return undefined for non-existent AbortController', () => {
      const controller = taskManager.getAbortController('non-existent-id');
      expect(controller).toBeUndefined();
    });
  });
});
