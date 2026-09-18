import Redis from 'ioredis';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '../index';

const origin = 'RedisSSEClient';

/** Redis pub/sub client for SSE, on the same REDIS_URI as the BullMQ queues. */
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

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing Redis SSE clients');

    try {
      const redisURI = (await Configuration.getConfig('REDIS_URI')) || 'redis';

      // Two connections, not one: once a connection has SUBSCRIBEd, ioredis
      // rejects `publish` on it with "Connection in subscriber mode, only
      // subscriber commands may be used".
      this.publisherClient = new Redis(redisURI);
      this.subscriberClient = new Redis(redisURI);

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
}
