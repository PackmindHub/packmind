import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerCaptureSignalTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `capture_signal`,
    {
      title: 'Capture Packmind Signal',
      description: 'Capture signal to update the coding standards and recipes.',
      inputSchema: {
        ruleContent: z.string().optional().describe('The rule name to capture'),
      },
    },
    async ({ ruleContent }: { ruleContent: string }) => {
      if (!userContext) {
        throw new Error('User context is required to show package details');
      }
      try {
        return {
          content: [
            {
              type: 'text',
              text: `Signal captured: ${ruleContent}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get package details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
