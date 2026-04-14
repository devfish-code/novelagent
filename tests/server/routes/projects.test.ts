import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp, registerErrorHandler } from '../../../src/server/app.js';
import { buildAppContext } from '../../../src/shells/contextBuilder.js';
import path from 'path';
import * as fs from 'fs-extra';
import projectRoutes from '../../../src/server/routes/projects.js';

describe('Project Routes', () => {
  let app: ReturnType<typeof createApp>;
  const testDir = path.join(process.cwd(), 'test-temp-projects-api');
  const configPath = path.join(testDir, 'config.yaml');

  // Setup test environment
  beforeEach(async () => {
    // Change back to original directory first
    const originalDir = process.cwd();
    if (originalDir.includes('test-temp-projects')) {
      process.chdir(path.join(originalDir, '..'));
    }

    // Clean up test directory if it exists
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }

    // Create new app instance for each test
    app = createApp();
    
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

    // Register routes
    app.use('/api/projects', projectRoutes);
    
    // Register error handler AFTER routes
    registerErrorHandler(app);

    // Change working directory to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change back to original directory
    const originalDir = process.cwd();
    if (originalDir.includes('test-temp-projects')) {
      process.chdir(path.join(originalDir, '..'));
    }

    // Clean up test directory
    try {
      if (await fs.pathExists(testDir)) {
        await fs.remove(testDir);
      }
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('POST /api/projects/init', () => {
    it('should initialize a new project', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({ name: 'test-project' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        project: {
          name: 'test-project',
          dir: expect.stringContaining('test-project'),
          createdAt: expect.any(String),
        },
      });

      // Verify config file was created
      const projectConfigPath = path.join(testDir, 'test-project', 'config.yaml');
      expect(await fs.pathExists(projectConfigPath)).toBe(true);
    });

    it('should reject invalid project names', async () => {
      const response = await request(app)
        .post('/api/projects/init')
        .send({ name: 'invalid name!' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
        },
      });
    });

    it('should reject duplicate project without force flag', async () => {
      // Create project first time
      await request(app)
        .post('/api/projects/init')
        .send({ name: 'duplicate-project' })
        .expect(201);

      // Try to create again without force
      const response = await request(app)
        .post('/api/projects/init')
        .send({ name: 'duplicate-project' })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PROJECT_ALREADY_EXISTS',
          message: expect.stringContaining('已存在'),
        },
      });
    });

    it('should allow overwriting with force flag', async () => {
      // Create project first time
      await request(app)
        .post('/api/projects/init')
        .send({ name: 'force-project' })
        .expect(201);

      // Overwrite with force flag
      const response = await request(app)
        .post('/api/projects/init')
        .send({ name: 'force-project', force: true })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      // Create some test projects
      await request(app)
        .post('/api/projects/init')
        .send({ name: 'project1' });

      await request(app)
        .post('/api/projects/init')
        .send({ name: 'project2' });

      // List projects
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: expect.arrayContaining([
          expect.objectContaining({
            name: 'project1',
            status: expect.any(String),
            progress: expect.any(Object),
            metadata: expect.any(Object),
          }),
          expect.objectContaining({
            name: 'project2',
          }),
        ]),
      });

      expect(response.body.projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no projects exist', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        projects: [],
      });
    });
  });

  describe('GET /api/projects/:name', () => {
    it('should get project details', async () => {
      // Create a test project
      await request(app)
        .post('/api/projects/init')
        .send({ name: 'detail-project' });

      // Get project details
      const response = await request(app)
        .get('/api/projects/detail-project')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        project: {
          name: 'detail-project',
          status: expect.any(String),
          progress: expect.any(Object),
          metadata: expect.any(Object),
          chapters: expect.any(Array),
        },
      });
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: expect.stringContaining('不存在'),
        },
      });
    });

    it('should reject invalid project names', async () => {
      const response = await request(app)
        .get('/api/projects/invalid name!')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('DELETE /api/projects/:name', () => {
    it('should delete a project', async () => {
      // Create a test project
      await request(app)
        .post('/api/projects/init')
        .send({ name: 'delete-project' });

      // Delete the project
      const response = await request(app)
        .delete('/api/projects/delete-project')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('已删除'),
      });

      // Verify project was deleted
      const projectDir = path.join(testDir, 'delete-project');
      expect(await fs.pathExists(projectDir)).toBe(false);
    });

    it('should return 404 when deleting non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/non-existent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
        },
      });
    });
  });

  describe('POST /api/projects/test-connection', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/projects/test-connection')
        .send({ model: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it.skip('should accept valid model values', async () => {
      // Note: This test will fail if AI connection actually fails
      // In a real test, we would mock the AI adapter
      // Skipped because it requires actual AI connection
      const validModels = ['main', 'json', 'all'];

      for (const model of validModels) {
        const response = await request(app)
          .post('/api/projects/test-connection')
          .send({ model });

        // Should not return validation error
        if (response.status === 400) {
          expect(response.body.error.code).not.toBe('VALIDATION_ERROR');
        }
      }
    });
  });
});
