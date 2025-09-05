/**
 * Redis channel constants for SSE pub/sub operations
 */
export const SSE_REDIS_CHANNELS = {
  /**
   * Channel for subscription management messages
   * Used when clients subscribe/unsubscribe to specific event types
   */
  SUBSCRIPTIONS: 'sse:subscriptions',

  /**
   * Channel for event notifications
   * Used to broadcast SSE events to all API instances
   */
  EVENTS: 'sse:events',
} as const;

/**
 * Redis pub/sub message for subscription management
 */
export interface SSESubscriptionMessage {
  /**
   * User ID that owns the SSE connection
   */
  userId: string;

  /**
   * Action to perform on the subscription
   */
  action: 'subscribe' | 'unsubscribe';

  /**
   * Type of event to subscribe/unsubscribe to
   */
  eventType: string;

  /**
   * Parameters for the event subscription (e.g., programId for program_status events)
   */
  params: string[];

  /**
   * Timestamp when the subscription message was created
   */
  timestamp: string;
}

/**
 * Redis pub/sub message for event notifications
 */
export interface SSEEventMessage {
  /**
   * Type of SSE event being published
   */
  eventType: string;

  /**
   * Parameters that identify the specific event instance
   */
  params: string[];

  /**
   * The actual SSE event data to send to clients
   */
  data: unknown; // Will be typed as AnySSEEvent when imported

  /**
   * Optional array of user IDs that should receive this event
   * If undefined, event is sent to all subscribers of this eventType+params
   */
  targetUserIds?: string[];

  /**
   * Timestamp when the event was published
   */
  timestamp: string;
}

/**
 * Union type of all Redis pub/sub messages for SSE
 */
export type SSERedisMessage = SSESubscriptionMessage | SSEEventMessage;

/**
 * Type guard to check if a message is a subscription message
 */
export function isSSESubscriptionMessage(
  message: SSERedisMessage,
): message is SSESubscriptionMessage {
  return (
    'action' in message &&
    ('subscribe' === message.action || 'unsubscribe' === message.action)
  );
}

/**
 * Type guard to check if a message is an event message
 */
export function isSSEEventMessage(
  message: SSERedisMessage,
): message is SSEEventMessage {
  return 'data' in message && !('action' in message);
}

/**
 * Helper function to create a subscription message
 */
export function createSSESubscriptionMessage(
  userId: string,
  action: 'subscribe' | 'unsubscribe',
  eventType: string,
  params: string[] = [],
): SSESubscriptionMessage {
  return {
    userId,
    action,
    eventType,
    params,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create an event message
 */
export function createSSEEventMessage(
  eventType: string,
  params: string[],
  data: unknown,
  targetUserIds?: string[],
): SSEEventMessage {
  return {
    eventType,
    params,
    data,
    targetUserIds,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to serialize Redis message to JSON string
 */
export function serializeSSERedisMessage(message: SSERedisMessage): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    throw new Error(
      `Failed to serialize SSE Redis message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Helper function to deserialize JSON string to Redis message
 */
export function deserializeSSERedisMessage(
  messageString: string,
): SSERedisMessage {
  try {
    const parsed = JSON.parse(messageString);

    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid message format: not an object');
    }

    if (!parsed.timestamp || typeof parsed.timestamp !== 'string') {
      throw new Error('Invalid message format: missing or invalid timestamp');
    }

    // Validate subscription message
    if ('action' in parsed) {
      if (!parsed.userId || typeof parsed.userId !== 'string') {
        throw new Error(
          'Invalid subscription message: missing or invalid userId',
        );
      }
      if (!parsed.eventType || typeof parsed.eventType !== 'string') {
        throw new Error(
          'Invalid subscription message: missing or invalid eventType',
        );
      }
      if (!Array.isArray(parsed.params)) {
        throw new Error(
          'Invalid subscription message: params must be an array',
        );
      }
      if (parsed.action !== 'subscribe' && parsed.action !== 'unsubscribe') {
        throw new Error(
          'Invalid subscription message: action must be subscribe or unsubscribe',
        );
      }
    }

    // Validate event message
    if ('data' in parsed) {
      if (!parsed.eventType || typeof parsed.eventType !== 'string') {
        throw new Error('Invalid event message: missing or invalid eventType');
      }
      if (!Array.isArray(parsed.params)) {
        throw new Error('Invalid event message: params must be an array');
      }
      if (parsed.data === undefined) {
        throw new Error('Invalid event message: missing data');
      }
      if (
        parsed.targetUserIds !== undefined &&
        !Array.isArray(parsed.targetUserIds)
      ) {
        throw new Error(
          'Invalid event message: targetUserIds must be an array or undefined',
        );
      }
    }

    return parsed as SSERedisMessage;
  } catch (error) {
    throw new Error(
      `Failed to deserialize SSE Redis message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
