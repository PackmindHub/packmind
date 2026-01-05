import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { registerMcpTool, ToolDependencies } from './types';

export function registerListPackagesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `list_packages`,
    {
      title: 'List Packages',
      description:
        'Get a list of all available packages in Packmind. Packages are collections of commands and standards that can be pulled together.',
      inputSchema: {},
    },
    async () => {
      if (!userContext) {
        throw new Error('User context is required to list packages');
      }

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const deploymentsHexa = fastify.deploymentsHexa();

        if (!deploymentsHexa) {
          throw new Error('DeploymentsHexa not available');
        }

        const response = await deploymentsHexa.getAdapter().listPackages({
          userId: userContext.userId,
          organizationId,
        });

        if (response.packages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No packages found for your organization',
              },
            ],
          };
        }

        // Sort alphabetically by slug
        const sortedPackages = response.packages.sort(
          (a: { slug: string }, b: { slug: string }) =>
            a.slug.localeCompare(b.slug),
        );

        // Format as bullet points: • slug: description
        const formattedList = sortedPackages
          .map(
            (pkg: {
              slug: string;
              name: string;
              description?: string | null;
            }) => `• ${pkg.slug}: ${pkg.description || pkg.name}`,
          )
          .join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `list_packages` },
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedList,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list packages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
