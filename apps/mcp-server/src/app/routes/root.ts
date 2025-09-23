import { FastifyInstance } from 'fastify';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PackmindLogger, LogLevel } from '@packmind/shared';

import { createMCPServer } from '../mcp-server';

interface UserContext {
  username: string;
  userId: string;
  organizationId: string;
}

interface JWTPayload {
  sub: string;
  username: string;
  organizationId: string;
  user: {
    name: string;
    userId: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export default async function (fastify: FastifyInstance) {
  const logger = new PackmindLogger('MCPRoutes', LogLevel.INFO);

  // JWT auth plugin is already registered via AutoLoad in app.ts
  // No need to register it again here

  // Public healthcheck endpoint (no authentication required)
  fastify.get('/mcp/healthcheck', async function () {
    logger.debug('Handling healthcheck request');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'packmind-mcp-server',
    };
  });

  async function handleMCPRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    // Extract user context from JWT token
    let userContext: UserContext | undefined;

    if (request.user && typeof request.user === 'object') {
      const user = request.user as JWTPayload;
      userContext = {
        username: user.username || user.user?.name || 'unknown',
        userId: user.sub || user.user?.userId || 'unknown',
        organizationId: user.organizationId || 'unknown',
      };
    }

    const mcpServer = createMCPServer(fastify, userContext);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServer.connect(transport);
    return await transport.handleRequest(request.raw, reply.raw, request.body);
  }

  // Protected MCP routes that require authentication
  fastify.post(
    '/mcp',
    {
      preHandler: fastify.authenticate(),
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      logger.debug('Handling authenticated MCP POST request', {
        user: typeof request.user === 'object' ? request.user.sub : 'unknown',
      });
      return await handleMCPRequest(request, reply);
    },
  );

  fastify.get(
    '/mcp',
    {
      preHandler: fastify.authenticate(),
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      logger.debug('Handling authenticated MCP GET request', {
        user: typeof request.user === 'object' ? request.user.sub : 'unknown',
      });
      return await handleMCPRequest(request, reply);
    },
  );
}
