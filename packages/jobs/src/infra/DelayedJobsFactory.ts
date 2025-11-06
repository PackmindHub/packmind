import { WorkerQueue } from './bullMQ/WorkerQueue';
import { IQueue, QueueListeners } from '../domain/IQueue';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';

const logger = new PackmindLogger('DelayedJobsFactory');

interface RedisConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

function parseRedisUri(redisUri: string | null): RedisConnectionConfig {
  const DEFAULT_HOST = 'redis';
  const DEFAULT_PORT = 6379;

  if (!redisUri || typeof redisUri !== 'string') {
    logger.warn(
      `Invalid or missing REDIS_URI configuration, using default connection redis://${DEFAULT_HOST}:${DEFAULT_PORT}`,
    );
    return {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
    };
  }

  try {
    const url = new URL(redisUri);

    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      logger.warn(
        `Invalid Redis URI protocol "${url.protocol}", expected "redis:" or "rediss:"`,
      );
      return {
        host: DEFAULT_HOST,
        port: DEFAULT_PORT,
      };
    }
    logger.info(`Connect with Redis URI protocol`);

    const host = url.hostname || DEFAULT_HOST;
    const port = url.port ? parseInt(url.port, 10) : DEFAULT_PORT;

    if (isNaN(port) || port <= 0 || port > 65535) {
      logger.warn(
        `Invalid port in Redis URI "${url.port}", using default port ${DEFAULT_PORT}`,
      );
      return {
        host,
        port: DEFAULT_PORT,
      };
    }

    logger.info(`Connecting redis to host ${host}`);

    return {
      host,
      port,
      username: url.username || undefined,
      password: url.password || undefined,
    };
  } catch (error) {
    logger.warn(
      `Failed to parse REDIS_URI "${redisUri}": ${error instanceof Error ? error.message : String(error)}. Using default connection.`,
    );
    return {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
    };
  }
}

export async function queueFactory<Input, Output>(
  queueId: string,
  queueListeners?: Partial<QueueListeners>,
): Promise<IQueue<Input, Output>> {
  const redisUri = await Configuration.getConfig('REDIS_URI');

  const connection = parseRedisUri(redisUri);

  return new WorkerQueue(queueId, connection, queueListeners);
}
