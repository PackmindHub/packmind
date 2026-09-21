import Redis from 'ioredis';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Configuration } from '../config/config/Configuration';

const origin = 'Cache';

/**
 * Redis-backed cache, fail-open by design: every operation degrades to a miss
 * rather than throwing, so a Redis outage - or a process that never called
 * initialize() - slows callers down instead of breaking them. The only method
 * that throws is initialize() itself.
 */
export class Cache {
  private static instance: Cache;

  private client?: Redis;
  private initialized = false;

  private static readonly DEFAULT_EXPIRATION_SECONDS = 300;

  static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
      Cache.instance.logger.info('Creating new Cache instance');
    }
    return Cache.instance;
  }

  private constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /** Call once at startup; every other method is a no-op until it has run. */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing Redis cache client');

    try {
      const redisUri = await Configuration.getConfig('REDIS_URI');

      if (!redisUri) {
        throw new Error('REDIS_URI configuration is required');
      }

      this.logger.info('Using REDIS_URI configuration');
      this.client = new Redis(redisUri, {
        maxRetriesPerRequest: 3,
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis cache client error', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

      this.client.on('connect', () => {
        this.logger.info('Redis cache client connected successfully');
      });

      this.initialized = true;
      this.logger.info('Cache initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Cache initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** JSON-serializes `value`; entries always carry a TTL. */
  async set(
    key: string,
    value: unknown,
    expirationSeconds: number = Cache.DEFAULT_EXPIRATION_SECONDS,
  ): Promise<void> {
    if (!this.initialized || !this.client) {
      this.logger.warn('Cache not initialized, skipping set operation', {
        key,
      });
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, expirationSeconds, serializedValue);
    } catch (error) {
      this.logger.warn(
        'Failed to set cache value, continuing without caching',
        {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Swallowed: a failed write only costs a later cache miss.
    }
  }

  /** null covers all of: miss, expired, unparseable, and Redis unreachable. */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.initialized || !this.client) {
      this.logger.warn(
        'Cache not initialized, returning null for get operation',
        { key },
      );
      return null;
    }

    try {
      const serializedValue = await this.client.get(key);

      if (serializedValue === null) {
        return null;
      }

      const value = JSON.parse(serializedValue) as T;
      return value;
    } catch (error) {
      this.logger.warn('Failed to get cache value, returning null', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async invalidate(key: string): Promise<void> {
    if (!this.initialized || !this.client) {
      this.logger.warn('Cache not initialized, skipping invalidate operation', {
        key,
      });
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(
        'Failed to invalidate cache key, continuing without invalidation',
        {
          key,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Swallowed, but note this leaves a stale entry readable until its TTL
      // expires - callers that need a hard guarantee cannot rely on this.
    }
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting cache client');

    if (this.client) {
      try {
        await this.client.disconnect();
        this.logger.info('Cache client disconnected successfully');
      } catch (error) {
        this.logger.error('Error disconnecting cache client', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.initialized = false;
  }
}
