import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { PackmindLogger, LogLevel } from '@packmind/shared';

export interface AuthPluginOptions {
  jwtSecret: string;
  audience: string;
}

/**
 * Authentication plugin for MCP server
 *
 * This plugin adds JWT token validation for protected routes
 * Not auto-registered - must be explicitly registered by jwt-auth plugin
 */
export default async function (
  fastify: FastifyInstance,
  options: AuthPluginOptions,
) {
  const logger = new PackmindLogger('AuthPlugin', LogLevel.INFO);

  // Register JWT validation decorator if it doesn't already exist
  if (!fastify.hasDecorator('validateToken')) {
    fastify.decorate(
      'validateToken',
      async function (request: FastifyRequest, reply: FastifyReply) {
        try {
          const authHeader = request.headers.authorization;

          if (!authHeader) {
            logger.warn('Missing authorization header');
            return reply.status(401).send({
              error: 'unauthorized',
              error_description: 'Missing authorization header',
            });
          }

          const parts = authHeader.split(' ');

          if (parts.length !== 2 || parts[0] !== 'Bearer') {
            logger.warn('Invalid authorization header format');
            return reply.status(401).send({
              error: 'unauthorized',
              error_description: 'Invalid authorization header format',
            });
          }

          const token = parts[1];

          // Verify the token
          const decoded = jwt.verify(token, options.jwtSecret, {
            audience: options.audience,
          });

          // Add the decoded token to the request for later use
          request.user = decoded;

          logger.debug('Token validated successfully', {
            user: typeof decoded === 'object' ? decoded.sub : 'unknown',
          });
        } catch (error) {
          logger.warn('Token validation failed', {
            error: error instanceof Error ? error.message : String(error),
          });

          return reply.status(401).send({
            error: 'unauthorized',
            error_description: 'Invalid token',
          });
        }
      },
    );
  }

  // Register a preHandler hook for protected routes if it doesn't already exist
  if (!fastify.hasDecorator('authenticate')) {
    fastify.decorate('authenticate', function () {
      return async function (request: FastifyRequest, reply: FastifyReply) {
        return fastify.validateToken(request, reply);
      };
    });
  }

  logger.info('Auth plugin registered successfully');
}

// Add TypeScript type definitions
declare module 'fastify' {
  interface FastifyInstance {
    validateToken: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authenticate: () => (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user?: jwt.JwtPayload | string;
  }
}
