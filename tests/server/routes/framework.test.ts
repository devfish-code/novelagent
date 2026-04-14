/**
 * Framework Generation Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { buildAppContext } from '../../../src/shells/contextBuilder.js';
import { TaskManager } from '../../../src/server/services/taskManager.js';
import { ProgressTracker } from '../../../src/server/services/progressTracker.js';
import { EventBroadcaster } from '../../../src/server/websocket/broadcaster.js';
import path from 'path';
import * as fs from 'fs-extra';
import frameworkRoutes from '../../../src/server/routes/framework.js';

describe('Framework Generation Routes', () => {
  const app = createApp();
  const testDir = path.join(process.cwd(), 'test-temp-framework-api');
  const configPath = path.join(testDir, 'config.yaml');

  // Setup test environment
  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);

    // Create a test config file
    const configContent = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
    await fs.writeFile(configPath, configContent, 'utf-8');

    // Build AppContext and attach to app
    const appContext = buildAppContext(configPath);
    app.locals.appContext = appContext;

    // Create mock WebSocket broadcaster
    const mockBroadcaster = {
      broadcastProgress: vi.fn(),
      broadcastStatus: vi.fn(),
      broadcastComplete: vi.fn(),
      broadcastError: vi.fn(),
    } as unknown as EventBroadcaster;

    // Initialize TaskManager and ProgressTracker
    const taskManager = new TaskManager();
    const progressTracker = new ProgressTracker(taskManager, mockBroadcaster);

    app.locals.taskManager = taskManager;
    app.locals.progressTracker = progressTracker;

    // Register routes
    app.use('/api/projects/:name/framework', frameworkRoutes);

    // Change working directory to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(path.join(testDir, '..'));

    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('POST /api/projects/:name/framework', () => {
    it('should accept valid framework generation request', async () => {
      const response = await request(app)
        .post('/api/projects/test-novel/framework')
        .send({
          creativeDescription: '这是一个关于修仙世界的小说，主角从一个普通少年成长为强大的修仙者。',
          volumes: 3,
          chaptersPerVolume: 10,
          wordsPerChapter: 3000,
        })
        .expect(202);

      expect(response.body).toMatchObject({
        success: true,
        taskId: expect.any(String),
        message: expect.stringContaining('框架生成任务已启动'),
      });

      // Wait a bit for background task to start
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should use default values when optional parameters are not provided', async () => {
      const response = await request(app)
        .post('/api/projects/test-novel2/framework')
        .send({
          creativeDescription: '这是一个关于修仙世界的小说，主角从一个普通少年成长为强大的修仙者。',
        })
        .expect(202);

      expect(response.body).toMatchObject({
        success: true,
        taskId: expect.any(String),
        message: expect.stringContaining('框架生成任务已启动'),
      });

      // Wait a bit for background task to start
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});
