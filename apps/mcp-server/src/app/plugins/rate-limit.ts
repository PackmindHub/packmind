import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { Configuration } from '@packmind/shared';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * This plugin adds rate limiting to the MCP server using dynamic configuration
 * Rate limits are configurable via Configuration.getConfig()
 *
 * @see https://github.com/fastify/rate-limit
 */
export default fp(async function (fastify: FastifyInstance) {
  const logger = new PackmindLogger('RateLimitPlugin', LogLevel.INFO);

  try {
    // Get rate limit configuration from Configuration.getConfig()
    const maxRequestsStr = await Configuration.getConfig(
      'RATE_LIMIT_MAX_REQUESTS',
    );
    const timeWindowStr = await Configuration.getConfig(
      'RATE_LIMIT_TIME_WINDOW',
    );

    // Default values: 30 requests per minute (60000ms)
    const maxRequests = maxRequestsStr ? parseInt(maxRequestsStr, 10) : 100;
    const timeWindow = timeWindowStr ? parseInt(timeWindowStr, 10) : 60000; // 1 minute in milliseconds

    logger.info('Configuring rate limiting', {
      maxRequests,
      timeWindow,
      timeWindowMinutes: timeWindow / 60000,
    });

    await fastify.register(rateLimit, {
      max: maxRequests,
      timeWindow,
      keyGenerator: (request) => {
        // Use IP address as the key for rate limiting
        return request.ip || 'unknown';
      },
      onExceeded: (request, key) => {
        logger.warn('Rate limit exceeded', {
          ip: request.ip,
          key,
          url: request.url,
          method: request.method,
        });
      },
    });

    logger.info('Rate limiting plugin registered successfully', {
      maxRequests,
      timeWindowMinutes: timeWindow / 60000,
    });
  } catch (error) {
    logger.error('Failed to register rate limiting plugin', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});
