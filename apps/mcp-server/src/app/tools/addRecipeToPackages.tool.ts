import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';

export function registerAddRecipeToPackagesTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

  mcpServer.tool(
    `${mcpToolPrefix}_add_recipe_to_packages`,
    'Add an existing recipe to one or more packages.',
    {
      recipeSlug: z
        .string()
        .min(1)
        .describe('The slug of the recipe to add to packages'),
      packageSlugs: z
        .array(z.string())
        .min(1)
        .describe('Array of package slugs to add the recipe to'),
    },
    async ({ recipeSlug, packageSlugs }) => {
      if (!userContext) {
        throw new Error('User context is required to add recipes to packages');
      }

      const recipesHexa = fastify.recipesHexa();
      const deploymentsHexa = fastify.deploymentsHexa();

      try {
        const organizationId = createOrganizationId(userContext.organizationId);
        const userId = createUserId(userContext.userId);

        // Find the recipe by slug
        const recipe = await recipesHexa
          .getAdapter()
          .findRecipeBySlug(recipeSlug, organizationId);

        if (!recipe) {
          return {
            content: [
              {
                type: 'text',
                text: `Recipe with slug '${recipeSlug}' not found`,
              },
            ],
          };
        }

        // Get all packages
        const { packages } = await deploymentsHexa
          .getAdapter()
          .listPackages({ userId, organizationId });

        // Filter to requested package slugs
        const targetPackages = packages.filter((pkg) =>
          packageSlugs.includes(pkg.slug),
        );

        if (targetPackages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No packages found with the provided slugs: ${packageSlugs.join(', ')}`,
              },
            ],
          };
        }

        // Add recipe to each package
        const results: string[] = [];
        for (const pkg of targetPackages) {
          try {
            await deploymentsHexa.getAdapter().addArtefactsToPackage({
              userId,
              organizationId,
              packageId: pkg.id,
              recipeIds: [recipe.id],
            });
            results.push(
              `✓ Added recipe '${recipeSlug}' to package '${pkg.slug}'`,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            results.push(
              `✗ Failed to add recipe '${recipeSlug}' to package '${pkg.slug}': ${errorMessage}`,
            );
          }
        }

        // Track analytics event
        analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
          tool: `${mcpToolPrefix}_add_recipe_to_packages`,
        });

        return {
          content: [
            {
              type: 'text',
              text: results.join('\n'),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to add recipe to packages', {
          recipeSlug,
          packageSlugs,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text',
              text: `Failed to add recipe to packages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
