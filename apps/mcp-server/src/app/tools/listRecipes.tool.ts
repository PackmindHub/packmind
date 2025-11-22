import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerListRecipesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  mcpServer.tool(
    `list_recipes`,
    'Get a list of current recipes in Packmind.',
    {},
    async () => {
      if (!userContext) {
        throw new Error('User context is required to list recipes');
      }

      const recipesHexa = fastify.recipesHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const globalSpace = await getGlobalSpace(fastify, organizationId);

        const recipes = await recipesHexa.getAdapter().listRecipesBySpace({
          organizationId,
          spaceId: globalSpace.id,
          userId: createUserId(userContext.userId),
        });

        if (recipes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No recipes found for your organization',
              },
            ],
          };
        }

        // Sort alphabetically by slug and limit to 20 recipes
        const sortedRecipes = recipes
          .sort((a, b) => a.slug.localeCompare(b.slug))
          .slice(0, 20);

        // Format as bullet points: • slug: name
        const formattedList = sortedRecipes
          .map((recipe) => `• ${recipe.slug}: ${recipe.name}`)
          .join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `list_recipes` },
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
              text: `Failed to list recipes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
