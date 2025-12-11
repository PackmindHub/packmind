import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerPushChangesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  //  const { fastify, userContext, analyticsAdapter } = dependencies;

  type PushChangesInput = {
    changes: {
      newRule: string;
      oldRule?: string;
      operation: string;
      standard: string;
    }[];
  };

  registerMcpTool(
    mcpServer,
    `push_changes`,
    {
      title: 'Push changes to Packmind',
      description: 'Push changes.yaml file to standards.',
      inputSchema: {
        changes: z.array(
          z.object({
            newRule: z.string(),
            oldRule: z.string().optional(),
            operation: z.string(),
            standard: z.string(),
          }),
        ),
      },
    },
    async (input: PushChangesInput) => {
      const { changes } = input;
      if (!changes) {
        throw new Error('Changes are required to push');
      }
      return {
        content: [
          {
            type: 'text',
            text: `Signal captured: ${JSON.stringify(changes, null, 2)}`,
          },
        ],
      };
    },
  );
}
