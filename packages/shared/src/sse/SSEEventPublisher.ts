import { RedisSSEClient } from './RedisSSEClient';
import {
  createSSEEventMessage,
  SSE_REDIS_CHANNELS,
  serializeSSERedisMessage,
} from './types';
import { PackmindLogger } from '../logger/PackmindLogger';
import {
  AnySSEEvent,
  createProgramStatusChangeEvent,
} from '../types/sse/SSEEvent';

const origin = 'SSEEventPublisher';

/**
 * Shared SSE Event Publisher following the Configuration singleton pattern
 * Used to publish SSE events to Redis pub/sub for distribution to all API instances
 */
export class SSEEventPublisher {
  private static instance: SSEEventPublisher;
  private static logger: PackmindLogger = new PackmindLogger(origin);
  private static redisClient: RedisSSEClient;

  /**
   * Get the singleton instance
   */
  static getInstance(): SSEEventPublisher {
    SSEEventPublisher.logger.debug('Getting SSEEventPublisher instance');
    if (!SSEEventPublisher.instance) {
      SSEEventPublisher.logger.info('Creating new SSEEventPublisher instance');
      SSEEventPublisher.instance = new SSEEventPublisher();
      SSEEventPublisher.redisClient = RedisSSEClient.getInstance();
    }
    return SSEEventPublisher.instance;
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Publish a program status change event for cache invalidation
   * This triggers React Query to refetch the program data
   */
  static async publishProgramStatusEvent(
    programId: string,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    SSEEventPublisher.logger.info('Publishing program status change event', {
      programId,
      userId,
      organizationId,
    });

    try {
      // Create minimal event payload - just programId for cache invalidation
      const event = createProgramStatusChangeEvent(programId);

      await SSEEventPublisher.publishEvent(
        'program_status_change',
        [programId],
        event,
        userId ? [userId] : undefined,
      );

      SSEEventPublisher.logger.debug(
        'Successfully published program status change event',
        { programId },
      );
    } catch (error) {
      SSEEventPublisher.logger.error(
        'Failed to publish program status change event',
        {
          programId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Generic method to publish any SSE event type to Redis pub/sub
   */
  static async publishEvent(
    eventType: string,
    params: string[],
    data: AnySSEEvent,
    targetUserIds?: string[],
  ): Promise<void> {
    SSEEventPublisher.logger.info('Publishing SSE event', {
      eventType,
      params,
      targetUserIds: targetUserIds?.length || 'all',
    });

    try {
      // Ensure Redis client is initialized
      SSEEventPublisher.getInstance();
      const redisClient = SSEEventPublisher.redisClient;

      // Create the Redis pub/sub message
      const message = createSSEEventMessage(
        eventType,
        params,
        data,
        targetUserIds,
      );

      // Publish to Redis events channel
      const serializedMessage = serializeSSERedisMessage(message);
      await redisClient.publish(SSE_REDIS_CHANNELS.EVENTS, serializedMessage);

      SSEEventPublisher.logger.debug('Successfully published SSE event', {
        eventType,
        params,
      });
    } catch (error) {
      SSEEventPublisher.logger.error('Failed to publish SSE event', {
        eventType,
        params,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
