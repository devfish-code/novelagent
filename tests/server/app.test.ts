import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';

describe('Express App', () => {
  const app = createApp();

  it('should respond to health check endpoint', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'NovelAgent API Server is running',
      timestamp: expect.any(String),
    });
  });

  it('should handle CORS headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/api/unknown')
      .expect(404);
  });
});
