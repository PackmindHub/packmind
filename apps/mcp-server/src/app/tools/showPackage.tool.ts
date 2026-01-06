import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerShowPackageTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `get_package_details`,
    {
      title: 'Get Package Details',
      description:
        'Get detailed information about a specific package including its commands and standards.',
      inputSchema: {
        packageSlug: z
          .string()
          .min(1)
          .describe('The slug of the package to retrieve'),
      },
    },
    async ({ packageSlug }: { packageSlug: string }) => {
      if (!userContext) {
        throw new Error('User context is required to show package details');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const deploymentsHexa = fastify.deploymentsHexa();

        if (!deploymentsHexa) {
          throw new Error('DeploymentsHexa not available');
        }

        const pkg = await deploymentsHexa.getAdapter().getPackageSummary({
          userId: userContext.userId,
          organizationId,
          slug: packageSlug,
        });

        // Build formatted content
        const contentParts = [
          `# ${pkg.name} (${pkg.slug})`,
          ``,
          pkg.description,
          ``,
        ];

        if (pkg.standards && pkg.standards.length > 0) {
          contentParts.push(`## Standards`, ``);
          for (const standard of pkg.standards) {
            if (standard.summary) {
              contentParts.push(`• ${standard.name}: ${standard.summary}`);
            } else {
              contentParts.push(`• ${standard.name}`);
            }
          }
          contentParts.push(``);
        }

        if (pkg.recipes && pkg.recipes.length > 0) {
          contentParts.push(`## Commands`, ``);
          for (const command of pkg.recipes) {
            contentParts.push(`• ${command.name}`);
          }
          contentParts.push(``);
        }

        const formattedContent = contentParts.join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `get_package_details`, packageSlug },
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
              text: `Failed to get package details: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
