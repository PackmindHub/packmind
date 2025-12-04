import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FastifyInstance } from 'fastify';
import { IEventTrackingPort } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { z } from 'zod';

export interface UserContext {
  email: string;
  userId: string;
  organizationId: string;
  role: string;
}

export interface ToolDependencies {
  fastify: FastifyInstance;
  userContext?: UserContext;
  analyticsAdapter: IEventTrackingPort;
  logger: PackmindLogger;
  mcpToolPrefix: string;
}

/**
 * MCP Tool Response type
 */
export type McpToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

/**
 * MCP Tool Configuration
 */
export type McpToolConfig = {
  title: string;
  description: string;
  inputSchema: z.ZodType | Record<string, z.ZodType>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler = (input: any) => Promise<McpToolResponse>;

/**
 * Helper function to register MCP tools with proper typing.
 *
 * MCP SDK 1.24+ has deeply recursive generic types in tool() that cause
 * TypeScript error TS2589 "Type instantiation is excessively deep and possibly infinite".
 * This wrapper centralizes the type workaround in one place.
 *
 * @see https://github.com/modelcontextprotocol/typescript-sdk/issues/324
 */
export function registerMcpTool(
  mcpServer: McpServer,
  name: string,
  config: McpToolConfig,
  handler: ToolHandler,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mcpServer as any).tool(
    name,
    config.description,
    config.inputSchema,
    handler,
  );
}
