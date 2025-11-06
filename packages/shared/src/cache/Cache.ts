import Redis, { RedisOptions } from 'ioredis';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Configuration } from '../config/config/Configuration';

const origin = 'Cache';

/**
 * Global Redis-based cache service
 * Provides a simple interface for caching data with expiration support
 */
export class Cache {
  private static instance: Cache;
  private static logger: PackmindLogger = new PackmindLogger(
    origin,
    LogLevel.INFO,
  );

  private client?: Redis;
  private connectionConfig: RedisOptions;
  private initialized = false;

  // Default cache expiration time in seconds (5 minutes)
  private static readonly DEFAULT_EXPIRATION_SECONDS = 300;

  /**
   * Get the singleton instance of Cache
   */
  static getInstance(): Cache {
    Cache.logger.debug('Getting Cache instance');
    if (!Cache.instance) {
      Cache.logger.info('Creating new Cache instance');
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  private constructor() {
    // Default Redis configuration - will be updated during initialization
    this.connectionConfig = {
      host: 'redis',
      port: 6379,
      maxRetriesPerRequest: 3,
    };
  }

  /**
   * Initialize the Redis client with configuration
   * This should be called during application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    Cache.logger.info('Initializing Redis cache client');

    try {
      const redisUri = await Configuration.getConfig('REDIS_URI');

      if (!redisUri) {
        throw new Error('REDIS_URI configuration is required');
      }

      Cache.logger.info('Using REDIS_URI configuration');
      this.client = new Redis(redisUri, {
        maxRetriesPerRequest: 3,
      });

      this.client.on('error', (error) => {
        Cache.logger.error('Redis cache client error', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

      this.client.on('connect', () => {
        Cache.logger.info('Redis cache client connected successfully');
      });

      this.initialized = true;
      Cache.logger.info('Cache initialization completed');
    } catch (error) {
      Cache.logger.error('Failed to initialize cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Cache initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Set a value in the cache with optional expiration
   * @param key - The cache key
   * @param value - The value to cache (will be JSON serialized)
   * @param expirationSeconds - Expiration time in seconds (default: 300s)
   */
  async set(
    key: string,
    value: unknown,
    expirationSeconds: number = Cache.DEFAULT_EXPIRATION_SECONDS,
  ): Promise<void> {
    if (!this.initialized || !this.client) {
      Cache.logger.warn('Cache not initialized, skipping set operation', {
        key,
      });
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, expirationSeconds, serializedValue);
    } catch (error) {
      Cache.logger.warn(
        'Failed to set cache value, continuing without caching',
        {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Don't throw - let the application continue without caching
    }
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found, expired, or error occurred
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.initialized || !this.client) {
      Cache.logger.warn(
        'Cache not initialized, returning null for get operation',
        { key },
      );
      return null;
    }

    try {
      const serializedValue = await this.client.get(key);

      if (serializedValue === null) {
        return null; // Cache miss
      }

      const value = JSON.parse(serializedValue) as T;
      return value;
    } catch (error) {
      Cache.logger.warn('Failed to get cache value, returning null', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return null on error to allow application to continue without cache
      return null;
    }
  }

  /**
   * Invalidate (delete) a cache entry
   * @param key - The cache key to invalidate
   */
  async invalidate(key: string): Promise<void> {
    if (!this.initialized || !this.client) {
      Cache.logger.warn(
        'Cache not initialized, skipping invalidate operation',
        { key },
      );
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      Cache.logger.warn(
        'Failed to invalidate cache key, continuing without invalidation',
        {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Don't throw - let the application continue
    }
  }

  /**
   * Disconnect the Redis client (for cleanup during shutdown)
   */
  async disconnect(): Promise<void> {
    Cache.logger.info('Disconnecting cache client');

    if (this.client) {
      try {
        await this.client.disconnect();
        Cache.logger.info('Cache client disconnected successfully');
      } catch (error) {
        Cache.logger.error('Error disconnecting cache client', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.initialized = false;
  }

  /**
   * Get cache statistics (for monitoring/debugging)
   */
  async getStats(): Promise<{ connected: boolean; initialized: boolean }> {
    return {
      connected: this.client?.status === 'ready',
      initialized: this.initialized,
    };
  }
}
