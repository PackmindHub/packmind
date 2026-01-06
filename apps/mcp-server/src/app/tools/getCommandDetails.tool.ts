import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerGetCommandDetailsTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `get_command_details`,
    {
      title: 'Get Command Details',
      description: 'Get the full content of a command by its slug.',
      inputSchema: {
        slug: z.string().min(1).describe('The slug of the command to retrieve'),
      },
    },
    async ({ slug }: { slug: string }) => {
      if (!userContext) {
        throw new Error('User context is required to get command by slug');
      }

      const recipesHexa = fastify.recipesHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);

        const command = await recipesHexa
          .getAdapter()
          .findRecipeBySlug(slug, organizationId);

        if (!command) {
          return {
            content: [
              {
                type: 'text',
                text: `Command with slug '${slug}' not found in your organization`,
              },
            ],
          };
        }

        // Format the command content for AI agents
        const formattedContent = [
          `# ${command.name}`,
          ``,
          `**Slug:** ${command.slug}`,
          `**Version:** ${command.version}`,
          ``,
          `---`,
          ``,
          command.content,
        ].join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `get_command_details`, slug },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedContent,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to get command: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
