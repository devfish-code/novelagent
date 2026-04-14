import path from 'path';
import { createApp, registerErrorHandler } from './app.js';
import { buildAppContext } from '../shells/contextBuilder.js';
import type { AppContext } from '../bus/effectRunner.js';
import projectRoutes from './routes/projects.js';
import frameworkRoutes from './routes/framework.js';
import chaptersRoutes from './routes/chapters.js';
import exportRoutes from './routes/export.js';
import { WSServer } from './websocket/server.js';
import { EventBroadcaster } from './websocket/broadcaster.js';
import { TaskManager } from './services/taskManager.js';
import { ProgressTracker } from './services/progressTracker.js';

const PORT = process.env.PORT || 3001;

// Create Express application
const app = createApp();

// Build AppContext
// For web server, we use a default config or environment-based config
// The actual project-specific config will be loaded when needed
const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.yaml');
let appContext: AppContext;

try {
  appContext = buildAppContext(configPath);
  console.log('AppContext initialized successfully');
} catch (error) {
  console.warn('Failed to load config from', configPath);
  console.warn('Using default AppContext (some features may be limited)');
  
  // Create a minimal AppContext for basic operations
  // This allows the server to start even without a config file
  const { OpenAICompatibleAdapter } = await import('../adapters/aiAdapter.js');
  const { FileSystemStorageAdapter } = await import('../adapters/storageAdapter.js');
  const { FileLoggerAdapter } = await import('../adapters/loggerAdapter.js');
  const { ConsoleUIAdapter } = await import('../adapters/uiAdapter.js');
  const { defaultConfig } = await import('../config/defaults.js');
  appContext = {
    ai: new OpenAICompatibleAdapter(defaultConfig.ai),
    storage: new FileSystemStorageAdapter(),
    logger: new FileLoggerAdapter(defaultConfig.logging),
    ui: new ConsoleUIAdapter(),
  };
}

// Make AppContext available to routes via app.locals
app.locals.appContext = appContext;

// Register API routes
app.use('/api/projects', projectRoutes);

// Register framework routes under /api/projects/:name/framework
app.use('/api/projects/:name/framework', frameworkRoutes);

// Register chapters routes under /api/projects/:name/chapters
app.use('/api/projects/:name/chapters', chaptersRoutes);

// Register export routes under /api/projects/:name/export and /api/projects/:name/exports
app.use('/api/projects/:name/export', exportRoutes);
app.use('/api/projects/:name/exports', exportRoutes);

// Register error handling middleware (MUST be after all routes)
registerErrorHandler(app);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Backend API Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API endpoints:`);
  console.log(`  POST   /api/projects/init`);
  console.log(`  GET    /api/projects`);
  console.log(`  GET    /api/projects/:name`);
  console.log(`  DELETE /api/projects/:name`);
  console.log(`  POST   /api/projects/test-connection`);
  console.log(`  POST   /api/projects/:name/framework`);
  console.log(`  POST   /api/projects/:name/chapters`);
  console.log(`  POST   /api/projects/:name/chapters/pause`);
  console.log(`  POST   /api/projects/:name/chapters/resume`);
  console.log(`  POST   /api/projects/:name/export`);
  console.log(`  GET    /api/projects/:name/exports/:filename`);
});

// Initialize WebSocket server
const wsServer = new WSServer(server);
const wsBroadcaster = new EventBroadcaster(wsServer);

// Initialize TaskManager and ProgressTracker
const taskManager = new TaskManager();
const progressTracker = new ProgressTracker(taskManager, wsBroadcaster);

// Make services available to routes via app.locals
app.locals.wsBroadcaster = wsBroadcaster;
app.locals.taskManager = taskManager;
app.locals.progressTracker = progressTracker;

console.log(`WebSocket server initialized on ws://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
