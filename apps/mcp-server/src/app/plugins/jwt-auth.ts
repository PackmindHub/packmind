import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * JWT Authentication plugin for MCP server
 *
 * This plugin registers the auth plugin with JWT configuration
 * and ensures it's only registered once.
 */
export default fp(
  async function (fastify: FastifyInstance) {
    const logger = new PackmindLogger('JWTAuthPlugin', LogLevel.INFO);

    // Get JWT configuration from environment variables
    // JWT_SECRET is guaranteed to be set in main.ts
    const jwtSecret = process.env.JWT_SECRET || 'default';
    const audience = process.env.JWT_AUDIENCE || '';

    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      throw new Error('JWT_SECRET environment variable is required');
    }

    // Register the auth plugin with the JWT configuration
    // Import the auth plugin directly for bundled build
    const authPlugin = await import('./auth');
    // Wrap the auth plugin with fastify-plugin to ensure its decorators are exposed
    const wrappedAuthPlugin = fp(authPlugin.default);
    await fastify.register(wrappedAuthPlugin, {
      jwtSecret,
      audience,
    });

    logger.info('JWT Auth plugin registered successfully');
  },
  {
    name: 'jwt-auth',
    dependencies: [],
    fastify: '>=4.x',
    decorators: {
      fastify: ['register'],
    },
  },
);
