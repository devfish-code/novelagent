import path from 'path';
import { fileURLToPath } from 'url';
import express, { Application } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // CORS configuration - allow frontend cross-origin access
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const webDistPath = path.join(__dirname, '../../web/dist');
    app.use(express.static(webDistPath));
    
    // Serve index.html for all non-API routes (SPA fallback)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        return next();
      }
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ 
      success: true, 
      message: 'NovelAgent API Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  // Note: Routes will be registered in index.ts after AppContext is created
  // This allows routes to access ctx via app.locals.appContext
  // Error handling middleware should be registered AFTER all routes

  return app;
}

/**
 * Register error handling middleware
 * This should be called AFTER all routes are registered
 */
export function registerErrorHandler(app: Application): void {
  app.use(errorHandler);
}
