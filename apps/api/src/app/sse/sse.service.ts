import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  AnySSEEvent,
  createHelloWorldEvent,
  createDataChangeEvent,
  createNotificationEvent,
} from '@packmind/types';
import {
  RedisSSEClient,
  SSE_REDIS_CHANNELS,
  type SSESubscriptionMessage,
  type SSEEventMessage,
  isSSESubscriptionMessage,
  isSSEEventMessage,
  deserializeSSERedisMessage,
  createSSESubscriptionMessage,
  serializeSSERedisMessage,
} from '@packmind/node-utils';
import { Response } from 'express';

const origin = 'SSEService';

/**
 * Enhanced SSE connection with subscription support
 */
interface SSEConnection {
  id: string;
  response: Response;
  userId: string; // Required - used as map key
  organizationId?: string;
  subscriptions: Set<string>; // Set of serialized subscription keys
  interval?: NodeJS.Timeout;
}

@Injectable()
export class SSEService implements OnModuleInit, OnModuleDestroy {
  private connections: Map<string, SSEConnection[]> = new Map(); // Map<userId, SSEConnection[]>
  private redisClient: RedisSSEClient;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SSEService initialized');
  }

  async onModuleInit(): Promise<void> {
    this.logger.info(
      'SSEService module initializing - setting up Redis client',
    );

    this.redisClient = RedisSSEClient.getInstance();

    // Subscribe to Redis channels for receiving events and subscription management
    await this.setupRedisSubscriptions();

    this.logger.info('SSEService module initialized with Redis subscriptions');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.info('SSEService module destroying - cleaning up connections');

    // Close all connections
    for (const userConnections of this.connections.values()) {
      for (const connection of userConnections) {
        this.cleanupConnection(connection);
      }
    }

    this.connections.clear();

    // Cleanup Redis subscriptions
    await this.redisClient.disconnect();

    this.logger.info('SSEService module destroyed');
  }

  /**
   * Set up Redis subscriptions to listen for events and subscription management
   */
  private async setupRedisSubscriptions(): Promise<void> {
    try {
      // Subscribe to event notifications
      await this.redisClient.subscribe(
        SSE_REDIS_CHANNELS.EVENTS,
        (message: string) => {
          this.handleRedisEventMessage(message);
        },
      );

      // Subscribe to subscription management messages
      await this.redisClient.subscribe(
        SSE_REDIS_CHANNELS.SUBSCRIPTIONS,
        (message: string) => {
          this.handleRedisSubscriptionMessage(message);
        },
      );

      this.logger.info('Redis subscriptions established', {
        channels: [SSE_REDIS_CHANNELS.EVENTS, SSE_REDIS_CHANNELS.SUBSCRIPTIONS],
      });
    } catch (error) {
      this.logger.error('Failed to setup Redis subscriptions', { error });
      throw error;
    }
  }

  /**
   * Handle incoming Redis event messages
   */
  private handleRedisEventMessage(messageString: string): void {
    try {
      const message = deserializeSSERedisMessage(messageString);

      if (!isSSEEventMessage(message)) {
        this.logger.warn('Received non-event message on events channel', {
          message,
        });
        return;
      }

      this.processEventMessage(message);
    } catch (error) {
      this.logger.error('Failed to process Redis event message', {
        error: error instanceof Error ? error.message : String(error),
        messageString,
      });
    }
  }

  /**
   * Handle incoming Redis subscription messages
   */
  private handleRedisSubscriptionMessage(messageString: string): void {
    try {
      const message = deserializeSSERedisMessage(messageString);

      if (!isSSESubscriptionMessage(message)) {
        this.logger.warn(
          'Received non-subscription message on subscriptions channel',
          { message },
        );
        return;
      }

      this.processSubscriptionMessage(message);
    } catch (error) {
      this.logger.error('Failed to process Redis subscription message', {
        error: error instanceof Error ? error.message : String(error),
        messageString,
      });
    }
  }

  /**
   * Process an SSE event message from Redis
   */
  private processEventMessage(message: SSEEventMessage): void {
    const subscriptionKey = this.createSubscriptionKey(
      message.eventType,
      message.params,
    );

    this.logger.debug('Processing event message', {
      eventType: message.eventType,
      params: message.params,
      subscriptionKey,
      targetUserIds: message.targetUserIds,
    });

    // Find all connections that should receive this event
    const targetConnections: SSEConnection[] = [];

    if (message.targetUserIds) {
      // Send to specific users only
      for (const userId of message.targetUserIds) {
        const userConnections = this.connections.get(userId) || [];
        for (const connection of userConnections) {
          if (connection.subscriptions.has(subscriptionKey)) {
            targetConnections.push(connection);
          }
        }
      }
    } else {
      // Send to all subscribers
      for (const userConnections of this.connections.values()) {
        for (const connection of userConnections) {
          if (connection.subscriptions.has(subscriptionKey)) {
            targetConnections.push(connection);
          }
        }
      }
    }

    // Send event to all target connections
    let successCount = 0;
    for (const connection of targetConnections) {
      if (
        this.sendEventToConnection(connection.id, message.data as AnySSEEvent)
      ) {
        successCount++;
      }
    }

    this.logger.info('Event message processed', {
      eventType: message.eventType,
      params: message.params,
      targetConnections: targetConnections.length,
      successCount,
    });
  }

  /**
   * Process a subscription message from Redis
   */
  private processSubscriptionMessage(message: SSESubscriptionMessage): void {
    const subscriptionKey = this.createSubscriptionKey(
      message.eventType,
      message.params,
    );
    const userConnections = this.connections.get(message.userId) || [];

    this.logger.debug('Processing subscription message', {
      userId: message.userId,
      action: message.action,
      eventType: message.eventType,
      params: message.params,
      subscriptionKey,
      userConnectionCount: userConnections.length,
    });

    // Apply subscription action to all user connections
    for (const connection of userConnections) {
      if (message.action === 'subscribe') {
        connection.subscriptions.add(subscriptionKey);
      } else {
        connection.subscriptions.delete(subscriptionKey);
      }
    }

    this.logger.info('Subscription message processed', {
      userId: message.userId,
      action: message.action,
      eventType: message.eventType,
      params: message.params,
      updatedConnections: userConnections.length,
    });
  }

  /**
   * Create a unique key for a subscription
   */
  private createSubscriptionKey(eventType: string, params: string[]): string {
    return `${eventType}:${params.join(',')}`.toUpperCase();
  }

  /**
   * Add a new SSE connection
   */
  addConnection(
    connectionId: string,
    response: Response,
    userId: string, // Required now
    organizationId?: string,
  ): void {
    if (!userId) {
      throw new Error('userId is required for SSE connections');
    }

    const totalConnectionsBefore = this.getTotalConnectionCount();

    this.logger.info('Adding SSE connection', {
      connectionId,
      userId,
      organizationId,
      totalConnections: totalConnectionsBefore + 1,
    });

    const connection: SSEConnection = {
      id: connectionId,
      response,
      userId,
      organizationId,
      subscriptions: new Set<string>(),
    };

    // Get or create user connections array
    const userConnections = this.connections.get(userId) || [];
    userConnections.push(connection);
    this.connections.set(userId, userConnections);

    // Set up cleanup when connection is closed
    response.on('close', () => {
      this.removeConnection(connectionId, userId);
    });

    response.on('error', (error) => {
      this.logger.error('SSE connection error', {
        connectionId,
        userId,
        error: error.message,
      });
      this.removeConnection(connectionId, userId);
    });

    // Send initial hello world event
    this.sendEventToConnection(
      connectionId,
      createHelloWorldEvent('Connected to SSE stream'),
    );

    // Start sending hello world every 5 seconds for this connection
    this.startHelloWorldInterval(connectionId);
  }

  /**
   * Start interval to send hello world every 5 seconds
   */
  private startHelloWorldInterval(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.findConnectionById(connectionId);
      if (!connection) {
        this.logger.info(
          'SSE: Connection no longer exists, clearing interval',
          { connectionId },
        );
        clearInterval(interval);
        return;
      }

      // Check if response is still writable
      if (connection.response.destroyed || connection.response.closed) {
        this.logger.info(
          'SSE: Response is destroyed/closed, removing connection',
          { connectionId },
        );
        this.removeConnection(connectionId, connection.userId);
        clearInterval(interval);
        return;
      }

      this.sendEventToConnection(
        connectionId,
        createHelloWorldEvent(`Hello World at ${new Date().toISOString()}`),
      );
    }, 5000);

    // Store interval reference for cleanup
    const connection = this.findConnectionById(connectionId);
    if (connection) {
      connection.interval = interval;
    }
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string, userId?: string): void {
    // Find connection if userId not provided
    if (!userId) {
      const connection = this.findConnectionById(connectionId);
      if (connection) {
        userId = connection.userId;
      }
    }

    if (!userId) {
      this.logger.warn('Cannot remove connection: userId not found', {
        connectionId,
      });
      return;
    }

    const userConnections = this.connections.get(userId) || [];
    const connectionIndex = userConnections.findIndex(
      (conn) => conn.id === connectionId,
    );

    if (connectionIndex === -1) {
      this.logger.warn('Connection not found for removal', {
        connectionId,
        userId,
      });
      return;
    }

    const connection = userConnections[connectionIndex];

    this.logger.info('Removing SSE connection', {
      connectionId,
      userId: connection.userId,
      organizationId: connection.organizationId,
      remainingUserConnections: userConnections.length - 1,
      remainingTotalConnections: this.getTotalConnectionCount() - 1,
    });

    // Cleanup connection resources
    this.cleanupConnection(connection);

    // Remove connection from user array
    userConnections.splice(connectionIndex, 1);

    // Remove user entry if no more connections
    if (userConnections.length === 0) {
      this.connections.delete(userId);
    } else {
      this.connections.set(userId, userConnections);
    }
  }

  /**
   * Cleanup connection resources
   */
  private cleanupConnection(connection: SSEConnection): void {
    // Clear the hello world interval
    if (connection.interval) {
      clearInterval(connection.interval);
    }

    try {
      if (!connection.response.destroyed && !connection.response.closed) {
        connection.response.end();
      }
    } catch (error) {
      this.logger.warn('Error closing SSE response', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find a connection by its ID across all users
   */
  private findConnectionById(connectionId: string): SSEConnection | undefined {
    for (const userConnections of this.connections.values()) {
      const connection = userConnections.find(
        (conn) => conn.id === connectionId,
      );
      if (connection) {
        return connection;
      }
    }
    return undefined;
  }

  /**
   * Get total number of connections across all users
   */
  private getTotalConnectionCount(): number {
    let total = 0;
    for (const userConnections of this.connections.values()) {
      total += userConnections.length;
    }
    return total;
  }

  /**
   * Send an event to a specific connection
   */
  sendEventToConnection(connectionId: string, event: AnySSEEvent): boolean {
    const connection = this.findConnectionById(connectionId);
    if (!connection) {
      this.logger.warn('Attempted to send event to non-existent connection', {
        connectionId,
      });
      return false;
    }

    // Check if response is still writable before attempting to send
    if (connection.response.destroyed || connection.response.closed) {
      this.logger.info('Cannot send event to destroyed/closed connection', {
        connectionId,
      });
      this.removeConnection(connectionId, connection.userId);
      return false;
    }

    try {
      const sseData = this.formatSSEEvent(event);
      connection.response.write(sseData);

      this.logger.debug('Event sent to connection', {
        connectionId,
        eventType: event.type,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send event to connection', {
        connectionId,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });

      // Remove broken connection
      this.removeConnection(connectionId, connection.userId);
      return false;
    }
  }

  /**
   * Broadcast an event to all connections
   */
  broadcastEvent(event: AnySSEEvent): number {
    const totalConnections = this.getTotalConnectionCount();

    this.logger.info('Broadcasting event to all connections', {
      eventType: event.type,
      totalConnections,
    });

    let successCount = 0;

    for (const userConnections of this.connections.values()) {
      for (const connection of userConnections) {
        if (this.sendEventToConnection(connection.id, event)) {
          successCount++;
        }
      }
    }

    this.logger.info('Event broadcast completed', {
      eventType: event.type,
      successCount,
      totalConnections,
    });

    return successCount;
  }

  /**
   * Broadcast event to connections of a specific user
   */
  broadcastEventToUser(userId: string, event: AnySSEEvent): number {
    const userConnections = this.connections.get(userId) || [];

    this.logger.info('Broadcasting event to user connections', {
      userId,
      eventType: event.type,
      userConnectionCount: userConnections.length,
    });

    let successCount = 0;

    for (const connection of userConnections) {
      if (this.sendEventToConnection(connection.id, event)) {
        successCount++;
      }
    }

    this.logger.info('User event broadcast completed', {
      userId,
      eventType: event.type,
      successCount,
    });

    return successCount;
  }

  /**
   * Broadcast event to connections of a specific organization
   */
  broadcastEventToOrganization(
    organizationId: string,
    event: AnySSEEvent,
  ): number {
    this.logger.info('Broadcasting event to organization connections', {
      organizationId,
      eventType: event.type,
    });

    let successCount = 0;

    for (const userConnections of this.connections.values()) {
      for (const connection of userConnections) {
        if (connection.organizationId === organizationId) {
          if (this.sendEventToConnection(connection.id, event)) {
            successCount++;
          }
        }
      }
    }

    this.logger.info('Organization event broadcast completed', {
      organizationId,
      eventType: event.type,
      successCount,
    });

    return successCount;
  }

  /**
   * Send a hello world event to all connections (for testing)
   */
  sendHelloWorld(message = 'Hello from SSE!'): number {
    const event = createHelloWorldEvent(message);
    return this.broadcastEvent(event);
  }

  /**
   * Send a data change event
   */
  sendDataChangeEvent<TPayload>(
    type: 'PUT' | 'DELETE' | 'CREATE' | 'UPDATE',
    data: TPayload,
    targetUserId?: string,
    targetOrganizationId?: string,
  ): number {
    const event = createDataChangeEvent(type, data);

    if (targetUserId) {
      return this.broadcastEventToUser(targetUserId, event);
    } else if (targetOrganizationId) {
      return this.broadcastEventToOrganization(targetOrganizationId, event);
    } else {
      return this.broadcastEvent(event);
    }
  }

  /**
   * Send a notification event
   */
  sendNotification(
    title: string,
    message: string,
    level = 'info' as 'info' | 'warning' | 'error' | 'success',
    targetUserId?: string,
    targetOrganizationId?: string,
  ): number {
    const event = createNotificationEvent(title, message, level);

    if (targetUserId) {
      return this.broadcastEventToUser(targetUserId, event);
    } else if (targetOrganizationId) {
      return this.broadcastEventToOrganization(targetOrganizationId, event);
    } else {
      return this.broadcastEvent(event);
    }
  }

  /**
   * Subscribe a user's connections to a specific event type with parameters
   */
  async subscribeUser(
    userId: string,
    eventType: string,
    params: string[] = [],
  ): Promise<void> {
    const subscriptionKey = this.createSubscriptionKey(eventType, params);
    const userConnections = this.connections.get(userId) || [];

    this.logger.info('Subscribing user to event', {
      userId,
      eventType,
      params,
      subscriptionKey,
      connectionCount: userConnections.length,
    });

    // Add subscription to all user connections
    for (const connection of userConnections) {
      connection.subscriptions.add(subscriptionKey);
    }

    // Publish subscription message to Redis for other instances
    try {
      const message = createSSESubscriptionMessage(
        userId,
        'subscribe',
        eventType,
        params,
      );
      const serializedMessage = serializeSSERedisMessage(message);
      await this.redisClient.publish(
        SSE_REDIS_CHANNELS.SUBSCRIPTIONS,
        serializedMessage,
      );
    } catch (error) {
      this.logger.error('Failed to publish subscription to Redis', {
        userId,
        eventType,
        params,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Unsubscribe a user's connections from a specific event type with parameters
   */
  async unsubscribeUser(
    userId: string,
    eventType: string,
    params: string[] = [],
  ): Promise<void> {
    const subscriptionKey = this.createSubscriptionKey(eventType, params);
    const userConnections = this.connections.get(userId) || [];

    this.logger.info('Unsubscribing user from event', {
      userId,
      eventType,
      params,
      subscriptionKey,
      connectionCount: userConnections.length,
    });

    // Remove subscription from all user connections
    for (const connection of userConnections) {
      connection.subscriptions.delete(subscriptionKey);
    }

    // Publish unsubscription message to Redis for other instances
    try {
      const message = createSSESubscriptionMessage(
        userId,
        'unsubscribe',
        eventType,
        params,
      );
      const serializedMessage = serializeSSERedisMessage(message);
      await this.redisClient.publish(
        SSE_REDIS_CHANNELS.SUBSCRIPTIONS,
        serializedMessage,
      );
    } catch (error) {
      this.logger.error('Failed to publish unsubscription to Redis', {
        userId,
        eventType,
        params,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get user subscriptions
   */
  getUserSubscriptions(userId: string): string[] {
    const userConnections = this.connections.get(userId) || [];
    const subscriptions = new Set<string>();

    for (const connection of userConnections) {
      for (const subscription of connection.subscriptions) {
        subscriptions.add(subscription);
      }
    }

    return Array.from(subscriptions);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    connectionsByUser: Record<string, number>;
    connectionsByOrganization: Record<string, number>;
    subscriptionStats: {
      totalSubscriptions: number;
      subscriptionsByEventType: Record<string, number>;
    };
  } {
    const connectionsByUser: Record<string, number> = {};
    const connectionsByOrganization: Record<string, number> = {};
    const allSubscriptions = new Set<string>();
    const subscriptionsByEventType: Record<string, number> = {};

    for (const [userId, userConnections] of this.connections) {
      connectionsByUser[userId] = userConnections.length;

      for (const connection of userConnections) {
        if (connection.organizationId) {
          connectionsByOrganization[connection.organizationId] =
            (connectionsByOrganization[connection.organizationId] || 0) + 1;
        }

        // Collect subscription stats
        for (const subscription of connection.subscriptions) {
          allSubscriptions.add(subscription);
          const eventType = subscription.split(':')[0];
          subscriptionsByEventType[eventType] =
            (subscriptionsByEventType[eventType] || 0) + 1;
        }
      }
    }

    return {
      totalConnections: this.getTotalConnectionCount(),
      connectionsByUser,
      connectionsByOrganization,
      subscriptionStats: {
        totalSubscriptions: allSubscriptions.size,
        subscriptionsByEventType,
      },
    };
  }

  /**
   * Format an SSE event according to the SSE specification
   */
  private formatSSEEvent(event: AnySSEEvent): string {
    const lines: string[] = [];

    // Add event type
    lines.push(`event: ${event.type}`);

    // Add event data (JSON stringified)
    const data = JSON.stringify(event.data);
    lines.push(`data: ${data}`);

    // Add timestamp as a comment
    lines.push(`: timestamp: ${event.timestamp}`);

    // End with double newline
    lines.push('', '');

    return lines.join('\n');
  }
}
