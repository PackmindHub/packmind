import Redis from 'ioredis';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '../index';

const origin = 'RedisSSEClient';

/**
 * Redis client specifically for SSE pub/sub operations
 * Reuses the same Redis connection configuration as BullMQ jobs
 */
export class RedisSSEClient {
  private static instance: RedisSSEClient;

  private publisherClient?: Redis;
  private subscriberClient?: Redis;
  private initialized = false;

  static getInstance(): RedisSSEClient {
    if (!RedisSSEClient.instance) {
      RedisSSEClient.instance = new RedisSSEClient();
      RedisSSEClient.instance.logger.info(
        'Creating new RedisSSEClient instance',
      );
    }
    return RedisSSEClient.instance;
  }

  private constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * Initialize Redis clients using the same configuration as BullMQ
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing Redis SSE clients');

    try {
      // Use the same Redis configuration as BullMQ (from DelayedJobsFactory pattern)
      const redisURI = (await Configuration.getConfig('REDIS_URI')) || 'redis';
      // Create separate clients for publisher and subscriber
      // This is required for Redis pub/sub - you cannot use the same connection for both
      this.publisherClient = new Redis(redisURI);
      this.subscriberClient = new Redis(redisURI);

      // Set up error handling
      this.publisherClient.on('error', (error) => {
        this.logger.error('Redis publisher client error', {
          error: error.message,
        });
      });

      this.subscriberClient.on('error', (error) => {
        this.logger.error('Redis subscriber client error', {
          error: error.message,
        });
      });

      // Test connections
      await this.publisherClient.ping();
      await this.subscriberClient.ping();

      this.initialized = true;
      this.logger.info('Redis SSE clients initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis SSE clients', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Publish a message to a Redis channel
   */
  async publish(channel: string, message: string): Promise<number> {
    await this.initialize();

    if (!this.publisherClient) {
      throw new Error('Publisher client not initialized');
    }

    this.logger.debug('Publishing message to Redis channel', {
      channel,
      messageLength: message.length,
    });

    try {
      const subscriberCount = await this.publisherClient.publish(
        channel,
        message,
      );
      this.logger.debug('Message published successfully', {
        channel,
        subscriberCount,
      });
      return subscriberCount;
    } catch (error) {
      this.logger.error('Failed to publish message', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Subscribe to a Redis channel
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    await this.initialize();

    if (!this.subscriberClient) {
      throw new Error('Subscriber client not initialized');
    }

    this.logger.info('Subscribing to Redis channel', { channel });

    try {
      this.subscriberClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          this.logger.debug('Received message from Redis channel', {
            channel: receivedChannel,
            messageLength: message.length,
          });
          callback(message);
        }
      });

      await this.subscriberClient.subscribe(channel);
      this.logger.info('Successfully subscribed to Redis channel', {
        channel,
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to Redis channel', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from a Redis channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriberClient) {
      return;
    }

    this.logger.info('Unsubscribing from Redis channel', { channel });

    try {
      await this.subscriberClient.unsubscribe(channel);
      this.logger.info('Successfully unsubscribed from Redis channel', {
        channel,
      });
    } catch (error) {
      this.logger.error('Failed to unsubscribe from Redis channel', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clean up Redis connections
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting Redis SSE clients');

    try {
      if (this.publisherClient) {
        this.publisherClient.disconnect();
      }

      if (this.subscriberClient) {
        this.subscriberClient.disconnect();
      }

      this.initialized = false;
      this.logger.info('Redis SSE clients disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting Redis SSE clients', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return (
      this.initialized &&
      this.publisherClient?.status === 'ready' &&
      this.subscriberClient?.status === 'ready'
    );
  }
}
