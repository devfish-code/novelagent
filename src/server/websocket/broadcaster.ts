import type { WSServer } from './server.js';
import type {
  ProgressEvent,
  LogEvent,
  StatusEvent,
  ErrorEvent,
  CompleteEvent,
} from '../types/websocket.js';

/**
 * Event Broadcaster
 * Provides high-level methods to broadcast events to subscribed clients
 */
export class EventBroadcaster {
  constructor(private wsServer: WSServer) {}

  /**
   * Broadcast progress update to subscribed clients
   */
  public broadcastProgress(projectName: string, event: Omit<ProgressEvent, 'type'>): void {
    this.wsServer.broadcastToProject(projectName, {
      type: 'progress',
      ...event,
    });
  }

  /**
   * Broadcast log message to subscribed clients
   */
  public broadcastLog(projectName: string, event: Omit<LogEvent, 'type'>): void {
    this.wsServer.broadcastToProject(projectName, {
      type: 'log',
      ...event,
    });
  }

  /**
   * Broadcast status change to subscribed clients
   */
  public broadcastStatus(projectName: string, event: Omit<StatusEvent, 'type'>): void {
    this.wsServer.broadcastToProject(projectName, {
      type: 'status',
      ...event,
    });
  }

  /**
   * Broadcast error to subscribed clients
   */
  public broadcastError(projectName: string, event: Omit<ErrorEvent, 'type'>): void {
    this.wsServer.broadcastToProject(projectName, {
      type: 'error',
      ...event,
    });
  }

  /**
   * Broadcast completion event to subscribed clients
   */
  public broadcastComplete(projectName: string, event: Omit<CompleteEvent, 'type'>): void {
    this.wsServer.broadcastToProject(projectName, {
      type: 'complete',
      ...event,
    });
  }

  /**
   * Get the number of clients subscribed to a project
   */
  public getSubscriberCount(projectName: string): number {
    return this.wsServer.getSubscriberCount(projectName);
  }

  /**
   * Get the total number of connected clients
   */
  public getClientCount(): number {
    return this.wsServer.getClientCount();
  }
}
