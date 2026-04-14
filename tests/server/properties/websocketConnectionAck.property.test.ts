/**
 * Property Test: WebSocket Connection Acknowledgment
 * **Validates: Requirements 6.2**
 * 
 * 验证每个 WebSocket 连接都收到唯一的确认消息
 */

import { describe, it, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createServer, Server as HTTPServer } from 'http';
import { WebSocket } from 'ws';
import { WSServer } from '../../../src/server/websocket/server.js';
import type { ServerMessage } from '../../../src/server/types/websocket.js';

describe('Property Test: WebSocket Connection Acknowledgment', () => {
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

  it('应该为每个连接发送唯一的确认消息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (connectionCount) => {
          const clients: WebSocket[] = [];
          const receivedMessages: Array<{ clientId: string; message: ServerMessage }> = [];

          try {
            // 创建多个并发连接
            const connectionPromises = Array.from({ length: connectionCount }, () => {
              return new Promise<void>((resolve, reject) => {
                const client = new WebSocket(`ws://localhost:${port}`);
                clients.push(client);

                const timeout = setTimeout(() => {
                  reject(new Error('Connection timeout'));
                }, 5000);

                client.on('message', (data) => {
                  try {
                    const message = JSON.parse(data.toString()) as ServerMessage;
                    
                    if (message.type === 'connected') {
                      receivedMessages.push({
                        clientId: message.clientId,
                        message,
                      });
                      clearTimeout(timeout);
                      resolve();
                    }
                  } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                  }
                });

                client.on('error', (error) => {
                  clearTimeout(timeout);
                  reject(error);
                });
              });
            });

            // 等待所有连接完成
            await Promise.all(connectionPromises);

            // 验证 1: 每个连接都收到恰好一条 connected 消息
            if (receivedMessages.length !== connectionCount) {
              return false;
            }

            // 验证 2: 所有消息都是 connected 类型
            const allConnectedType = receivedMessages.every(
              ({ message }) => message.type === 'connected'
            );
            if (!allConnectedType) {
              return false;
            }

            // 验证 3: 所有消息都包含 clientId 字段
            const allHaveClientId = receivedMessages.every(
              ({ message }) => 'clientId' in message && typeof message.clientId === 'string'
            );
            if (!allHaveClientId) {
              return false;
            }

            // 验证 4: 所有 clientId 都是非空字符串
            const allNonEmptyClientId = receivedMessages.every(
              ({ clientId }) => clientId.length > 0
            );
            if (!allNonEmptyClientId) {
              return false;
            }

            // 验证 5: 所有 clientId 都是唯一的
            const clientIds = receivedMessages.map(({ clientId }) => clientId);
            const uniqueClientIds = new Set(clientIds);
            if (uniqueClientIds.size !== connectionCount) {
              return false;
            }

            return true;
          } finally {
            // 清理：关闭所有客户端连接
            await Promise.all(
              clients.map(
                (client) =>
                  new Promise<void>((resolve) => {
                    if (client.readyState === WebSocket.OPEN) {
                      client.close();
                      client.on('close', () => resolve());
                    } else {
                      resolve();
                    }
                  })
              )
            );
          }
        }
      ),
      { numRuns: 20 } // 运行 20 次以确保稳定性
    );
  });
});
