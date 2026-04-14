import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { randomUUID } from 'crypto';
import type { ClientMessage, ServerMessage } from '../types/websocket.js';

/**
 * WebSocket Server for real-time communication
 * Manages client connections, subscriptions, and message routing
 */
export class WSServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // clientId -> Set<projectName>

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = randomUUID();
      this.clients.set(clientId, ws);
      this.subscriptions.set(clientId, new Set());

      console.log(`[WebSocket] Client connected: ${clientId}`);

      // Send connection acknowledgment
      this.sendToClient(clientId, { type: 'connected', clientId });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as ClientMessage;
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
        this.subscriptions.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for client ${clientId}:`, error);
      });
    });
  }

  private handleClientMessage(clientId: string, message: ClientMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.projectName);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.projectName);
        break;
      case 'cancel':
        this.handleCancel(clientId, message.projectName, message.taskId);
        break;
      case 'ping':
        this.handlePing(clientId);
        break;
      default:
        console.warn(`[WebSocket] Unknown message type from ${clientId}`);
    }
  }

  private handleSubscribe(clientId: string, projectName: string): void {
    const subs = this.subscriptions.get(clientId);
    if (subs) {
      subs.add(projectName);
      console.log(`[WebSocket] Client ${clientId} subscribed to project: ${projectName}`);
    }
  }

  private handleUnsubscribe(clientId: string, projectName: string): void {
    const subs = this.subscriptions.get(clientId);
    if (subs) {
      subs.delete(projectName);
      console.log(`[WebSocket] Client ${clientId} unsubscribed from project: ${projectName}`);
    }
  }

  private handleCancel(clientId: string, projectName: string, taskId: string): void {
    console.log(`[WebSocket] Cancel request from ${clientId} for project ${projectName}, task ${taskId}`);
    // TODO: Implement task cancellation logic
    // This will be handled by the task execution system
  }

  private handlePing(clientId: string): void {
    this.sendToClient(clientId, { type: 'pong' });
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(clientId: string, message: ServerMessage): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WebSocket] Failed to send message to ${clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast a message to all clients subscribed to a specific project
   */
  public broadcastToProject(projectName: string, message: ServerMessage): void {
    let sentCount = 0;
    
    for (const [clientId, subs] of this.subscriptions.entries()) {
      if (subs.has(projectName)) {
        this.sendToClient(clientId, message);
        sentCount++;
      }
    }

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcasted ${message.type} to ${sentCount} client(s) for project: ${projectName}`);
    }
  }

  /**
   * Get the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get the number of clients subscribed to a project
   */
  public getSubscriberCount(projectName: string): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      if (subs.has(projectName)) {
        count++;
      }
    }
    return count;
  }
}
