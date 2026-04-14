/**
 * Export Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/server/app.js';
import { buildAppContext } from '../../../src/shells/contextBuilder.js';
import path from 'path';
import * as fs from 'fs-extra';
import exportRoutes from '../../../src/server/routes/export.js';

describe('Export Routes', () => {
  const app = createApp();
  const testDir = path.join(process.cwd(), 'test-temp-export-api');
  const configPath = path.join(testDir, 'config.yaml');
  const projectName = 'test-project';
  const projectDir = path.join(testDir, projectName);

  // Setup test environment
  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, 'exports'));

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

    // Create project config.yaml
    await fs.writeFile(path.join(projectDir, 'config.yaml'), configContent, 'utf-8');

    // Create project.json
    const projectJson = {
      projectName,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: {
        totalChapters: 30,
        completedChapters: 30,
      },
      statistics: {
        totalWords: 90000,
        totalAICalls: 100,
        totalTokens: 500000,
        totalFixRounds: 10,
      },
      chapters: [],
    };
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(projectJson, null, 2),
      'utf-8'
    );

    // Create test export files
    await fs.writeFile(
      path.join(projectDir, 'exports', 'novel.md'),
      '# Test Novel\n\nThis is a test novel.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(projectDir, 'exports', 'world.md'),
      '# World\n\nThis is the world.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(projectDir, 'exports', 'characters.md'),
      '# Characters\n\nThese are the characters.',
      'utf-8'
    );

    // Build AppContext and attach to app
    const appContext = buildAppContext(configPath);
    app.locals.appContext = appContext;

    // Register routes
    app.use('/api/projects/:name/export', exportRoutes);
    app.use('/api/projects/:name/exports', exportRoutes);

    // Change working directory to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(path.join(testDir, '..'));

    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('POST /api/projects/:name/export', () => {
    it('should export project with markdown format', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectName}/export`)
        .send({
          format: 'markdown',
          files: ['novel', 'world', 'characters'],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        files: expect.arrayContaining([
          expect.objectContaining({
            name: 'novel.md',
            url: expect.stringContaining('/exports/novel.md'),
            size: expect.any(Number),
          }),
        ]),
      });
    });
  });

  describe('GET /api/projects/:name/exports/:filename', () => {
    it('should download existing export file', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectName}/exports/novel.md`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Test Novel');
    });
  });
});
