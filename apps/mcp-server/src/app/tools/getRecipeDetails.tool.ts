import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';

export function registerGetRecipeDetailsTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  mcpServer.tool(
    `get_recipe_details`,
    'Get the full content of a recipe by its slug.',
    {
      recipeSlug: z
        .string()
        .min(1)
        .describe('The slug of the recipe to retrieve'),
    },
    async ({ recipeSlug }) => {
      if (!userContext) {
        throw new Error('User context is required to get recipe by slug');
      }

      const recipesHexa = fastify.recipesHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);

        const recipe = await recipesHexa
          .getAdapter()
          .findRecipeBySlug(recipeSlug, organizationId);

        if (!recipe) {
          return {
            content: [
              {
                type: 'text',
                text: `Recipe with slug '${recipeSlug}' not found in your organization`,
              },
            ],
          };
        }

        // Format the recipe content for AI agents
        const formattedContent = [
          `# ${recipe.name}`,
          ``,
          `**Slug:** ${recipe.slug}`,
          `**Version:** ${recipe.version}`,
          ``,
          `---`,
          ``,
          recipe.content,
        ].join('\n');

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `get_recipe_details`, recipeSlug },
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
              text: `Failed to get recipe: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
