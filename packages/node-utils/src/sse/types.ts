/**
 * The two channels every API instance shares: an SSE connection lives on one
 * instance, so both subscriptions and events have to reach all of them.
 */
export const SSE_REDIS_CHANNELS = {
  SUBSCRIPTIONS: 'sse:subscriptions',
  EVENTS: 'sse:events',
} as const;

export interface SSESubscriptionMessage {
  userId: string;
  action: 'subscribe' | 'unsubscribe';
  eventType: string;

  /** Narrows the subscription to one instance of the event type. */
  params: string[];

  timestamp: string;
}

export interface SSEEventMessage {
  eventType: string;
  params: string[];

  /** An `AnySSEEvent` from @packmind/types, left `unknown` to avoid the import. */
  data: unknown;

  /** When undefined, every subscriber of this eventType+params receives it. */
  targetUserIds?: string[];

  timestamp: string;
}

export type SSERedisMessage = SSESubscriptionMessage | SSEEventMessage;

export function isSSESubscriptionMessage(
  message: SSERedisMessage,
): message is SSESubscriptionMessage {
  return (
    'action' in message &&
    ('subscribe' === message.action || 'unsubscribe' === message.action)
  );
}

export function isSSEEventMessage(
  message: SSERedisMessage,
): message is SSEEventMessage {
  return 'data' in message && !('action' in message);
}

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

export function serializeSSERedisMessage(message: SSERedisMessage): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    throw new Error(
      `Failed to serialize SSE Redis message: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function deserializeSSERedisMessage(
  messageString: string,
): SSERedisMessage {
  try {
    const parsed = JSON.parse(messageString);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid message format: not an object');
    }

    if (!parsed.timestamp || typeof parsed.timestamp !== 'string') {
      throw new Error('Invalid message format: missing or invalid timestamp');
    }

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
