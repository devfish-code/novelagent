# Logger Adapter WebSocket Integration

## Overview

The `FileLoggerAdapter` has been enhanced to support real-time log broadcasting via WebSocket. This allows logs to be pushed to subscribed WebSocket clients in addition to being written to files.

## Features

- **Backward Compatible**: The WebSocket functionality is completely optional. Existing code continues to work without any changes.
- **Fire-and-Forget**: WebSocket broadcasting does not block or affect file logging. If broadcasting fails, file logging continues normally.
- **Automatic Sanitization**: Sensitive information (API keys, tokens, passwords) is automatically sanitized before broadcasting, just like in file logs.
- **Log Level Filtering**: Only logs that pass the configured log level filter are broadcast.

## Usage

### Basic Usage (File-Only Logging)

```typescript
import { FileLoggerAdapter } from './adapters/loggerAdapter.js';

const config = {
  logLevel: 'info',
  logDir: './logs',
};

const logger = new FileLoggerAdapter(config);
logger.info('Application started');
```

### Enhanced Usage (File + WebSocket Broadcasting)

```typescript
import { FileLoggerAdapter } from './adapters/loggerAdapter.js';
import { EventBroadcaster } from './server/websocket/broadcaster.js';
import { WSServer } from './server/websocket/server.js';

// Create WebSocket server and broadcaster
const wsServer = new WSServer(httpServer);
const broadcaster = new EventBroadcaster(wsServer);

// Create logger with WebSocket support
const config = {
  logLevel: 'info',
  logDir: './logs',
};

const logger = new FileLoggerAdapter(
  config,
  broadcaster,      // EventBroadcaster instance
  'my-project'      // Project name for routing logs to subscribed clients
);

// Logs are now written to file AND broadcast via WebSocket
logger.info('Generation started', { phase: 1 });
logger.debug('Processing chapter', { chapter: 1 });
logger.error('Generation failed', new Error('AI timeout'));
```

## Constructor Parameters

```typescript
constructor(
  config: LoggingConfig,           // Required: logging configuration
  wsBroadcaster?: EventBroadcaster, // Optional: WebSocket broadcaster
  projectName?: string              // Optional: project identifier
)
```

### Parameters

- **config** (required): Logging configuration object
  - `logLevel`: 'debug' | 'info' | 'error'
  - `logDir`: Directory path for log files

- **wsBroadcaster** (optional): EventBroadcaster instance for WebSocket broadcasting
  - If not provided, only file logging is performed
  - Must be provided together with `projectName` for broadcasting to work

- **projectName** (optional): Project identifier for routing logs
  - Used to route logs to clients subscribed to this specific project
  - Must be provided together with `wsBroadcaster` for broadcasting to work

## WebSocket Log Event Format

When logs are broadcast via WebSocket, they follow this format:

```typescript
interface LogEvent {
  type: 'log';
  projectName: string;
  timestamp: string;              // ISO 8601 format
  level: 'info' | 'debug' | 'error';
  message: string;
  context?: Record<string, unknown>;
}
```

### Example Log Event

```json
{
  "type": "log",
  "projectName": "my-novel",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Chapter generation completed",
  "context": {
    "chapter": 1,
    "wordCount": 3500,
    "duration": 45.2
  }
}
```

## Behavior Details

### When WebSocket Broadcasting Occurs

WebSocket broadcasting happens when **ALL** of the following conditions are met:

1. `wsBroadcaster` parameter is provided to the constructor
2. `projectName` parameter is provided to the constructor
3. The log level passes the configured filter (e.g., debug logs are not broadcast if logLevel is 'info')

### When WebSocket Broadcasting is Skipped

Broadcasting is silently skipped (no error) when:

- `wsBroadcaster` is not provided
- `projectName` is not provided
- The log level is filtered out by the configured log level

### Error Handling

If WebSocket broadcasting fails (e.g., network error, client disconnected):

- The error is logged to console.error
- File logging continues normally
- The application does not crash or throw an exception

This ensures that WebSocket issues never affect the core logging functionality.

## Security Considerations

### Automatic Sanitization

Sensitive information is automatically sanitized before broadcasting:

```typescript
// Input
logger.info('API call', {
  apiKey: 'sk-1234567890abcdef',
  token: 'secret-token-xyz',
  username: 'john'
});

// Broadcast output
{
  "context": {
    "apiKey": "sk-1****",
    "token": "secr****",
    "username": "john"
  }
}
```

Sensitive field names include:
- `apikey`, `api_key`
- `token`
- `password`
- `secret`

The sanitization works recursively for nested objects and arrays.

## Testing

The implementation includes comprehensive tests:

- **Backward Compatibility**: 12 tests verify existing functionality remains unchanged
- **WebSocket Integration**: 14 tests verify new WebSocket broadcasting features
- **Error Handling**: Tests verify that WebSocket failures don't affect file logging
- **Sanitization**: Tests verify sensitive data is sanitized before broadcasting

Run tests:

```bash
npm test -- tests/adapters/loggerAdapter
```

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 6.3**: WebSocket events include timestamp and project name
- **Requirement 6.4**: Logger pushes log events to subscribed clients

## Example: Integration with Command Bus

```typescript
import { CommandBus } from './bus/dispatcher.js';
import { FileLoggerAdapter } from './adapters/loggerAdapter.js';
import { EventBroadcaster } from './server/websocket/broadcaster.js';

class ProjectService {
  constructor(
    private wsServer: WSServer,
    private projectName: string
  ) {}

  async generateFramework(creativeDescription: string) {
    // Create logger with WebSocket support for this project
    const broadcaster = new EventBroadcaster(this.wsServer);
    const logger = new FileLoggerAdapter(
      { logLevel: 'info', logDir: './logs' },
      broadcaster,
      this.projectName
    );

    // Create command bus with enhanced logger
    const bus = new CommandBus({
      logger,
      // ... other adapters
    });

    // All logs from the command bus will now be broadcast
    await bus.dispatch({
      type: 'GENERATE_FRAMEWORK',
      payload: { creativeDescription }
    });
  }
}
```

## Migration Guide

### Existing Code (No Changes Required)

```typescript
// This continues to work exactly as before
const logger = new FileLoggerAdapter(config);
logger.info('message');
```

### Adding WebSocket Support

```typescript
// Simply add two optional parameters
const logger = new FileLoggerAdapter(
  config,
  broadcaster,  // Add this
  projectName   // Add this
);
logger.info('message'); // Now broadcasts AND writes to file
```

No other code changes are required!
