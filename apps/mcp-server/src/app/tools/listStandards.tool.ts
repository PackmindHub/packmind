import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerListStandardsTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, mcpToolPrefix } =
    dependencies;

  mcpServer.tool(
    `${mcpToolPrefix}_list_standards`,
    'Get a list of current standards in Packmind',
    {},
    async () => {
      if (!userContext) {
        throw new Error('User context is required to list standards');
      }

      const standardsHexa = fastify.standardsHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const globalSpace = await getGlobalSpace(fastify, organizationId);

        const standards = await standardsHexa
          .getAdapter()
          .listStandardsBySpace(
            globalSpace.id,
            organizationId,
            userContext.userId,
          );

        if (standards.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No standards found for your organization',
              },
            ],
          };
        }

        // Sort alphabetically by slug and limit to 20 standards
        const sortedStandards = standards
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .slice(0, 20);

        // Format as bullet points: • slug: name
        const formattedList = sortedStandards
          .map((standard) => `• ${standard.slug}: ${standard.name}`)
          .join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `${mcpToolPrefix}_list_standards` },
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
              text: `Failed to list standards: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
