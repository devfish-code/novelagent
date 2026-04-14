import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HTTPServer } from 'http';
import { WebSocket } from 'ws';
import { WSServer } from '../../../src/server/websocket/server.js';
import type { ServerMessage, ClientMessage } from '../../../src/server/types/websocket.js';

describe('WSServer', () => {
  let httpServer: HTTPServer;
  let wsServer: WSServer;
  let port: number;

  beforeEach(async () => {
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        wsServer = new WSServer(httpServer);
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it('should accept client connections and send connected message', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    const message = await new Promise<ServerMessage>((resolve) => {
      client.on('message', (data) => {
        resolve(JSON.parse(data.toString()) as ServerMessage);
      });
    });

    expect(message.type).toBe('connected');
    expect(message).toHaveProperty('clientId');
    client.close();
  });

  it('should handle ping-pong messages', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      let receivedConnected = false;

      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        
        if (message.type === 'connected') {
          receivedConnected = true;
          const pingMessage: ClientMessage = { type: 'ping' };
          client.send(JSON.stringify(pingMessage));
        } else if (message.type === 'pong' && receivedConnected) {
          client.close();
          resolve();
        }
      });
    });
  });

  it('should handle subscribe and unsubscribe messages', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        
        if (message.type === 'connected') {
          const subscribeMsg: ClientMessage = { 
            type: 'subscribe', 
            projectName: 'test-project' 
          };
          client.send(JSON.stringify(subscribeMsg));

          setTimeout(() => {
            const unsubscribeMsg: ClientMessage = { 
              type: 'unsubscribe', 
              projectName: 'test-project' 
            };
            client.send(JSON.stringify(unsubscribeMsg));
            client.close();
            resolve();
          }, 100);
        }
      });
    });
  });

  it('should broadcast messages to subscribed clients', async () => {
    const client1 = new WebSocket(`ws://localhost:${port}`);
    const client2 = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      let client1Connected = false;
      let client2Connected = false;

      client1.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        
        if (message.type === 'connected') {
          client1Connected = true;
          const subscribeMsg: ClientMessage = { 
            type: 'subscribe', 
            projectName: 'test-project' 
          };
          client1.send(JSON.stringify(subscribeMsg));
          
          if (client2Connected) {
            setTimeout(() => {
              wsServer.broadcastToProject('test-project', {
                type: 'status',
                projectName: 'test-project',
                timestamp: new Date().toISOString(),
                status: 'generating',
              });
            }, 100);
          }
        } else if (message.type === 'status') {
          expect(message.projectName).toBe('test-project');
          expect(message.status).toBe('generating');
          client1.close();
          client2.close();
          resolve();
        }
      });

      client2.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        
        if (message.type === 'connected') {
          client2Connected = true;
          
          if (client1Connected) {
            setTimeout(() => {
              wsServer.broadcastToProject('test-project', {
                type: 'status',
                projectName: 'test-project',
                timestamp: new Date().toISOString(),
                status: 'generating',
              });
            }, 100);
          }
        } else if (message.type === 'status') {
          expect.fail('Client2 should not receive broadcast for unsubscribed project');
        }
      });
    });
  });

  it('should track client and subscriber counts', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString()) as ServerMessage;
        
        if (message.type === 'connected') {
          expect(wsServer.getClientCount()).toBe(1);
          
          const subscribeMsg: ClientMessage = { 
            type: 'subscribe', 
            projectName: 'test-project' 
          };
          client.send(JSON.stringify(subscribeMsg));

          setTimeout(() => {
            expect(wsServer.getSubscriberCount('test-project')).toBe(1);
            client.close();
            resolve();
          }, 100);
        }
      });
    });
  });
});
