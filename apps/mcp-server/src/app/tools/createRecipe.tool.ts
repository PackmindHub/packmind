import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createOrganizationId,
  createUserId,
  RecipeStep,
} from '@packmind/types';
import { z } from 'zod';
import { ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

export function registerCreateRecipeTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

  mcpServer.tool(
    `${mcpToolPrefix}_create_recipe`,
    'Create a new reusable recipe as a structured Packmind recipe. Do not call this tool directly—you need to first use the tool recipe_creation_workflow',
    {
      name: z.string().min(1).describe('The name of the recipe to create'),
      summary: z
        .string()
        .min(1)
        .describe(
          'A concise sentence describing the intent of this recipe (what it does) and its value (why it is useful) and when it is relevant to use it',
        ),
      whenToUse: z
        .array(z.string())
        .describe(
          'Array of scenarios when this recipe is applicable. Provide specific, actionable scenarios.',
        ),
      contextValidationCheckpoints: z
        .array(z.string())
        .describe(
          'Array of checkpoints to ensure the context is clarified enough before implementing the recipe steps. Each checkpoint should be a question or validation point.',
        ),
      steps: z
        .array(
          z.object({
            name: z
              .string()
              .min(1)
              .describe(
                'The name/title of the step (e.g., "Setup Dependencies")',
              ),
            description: z
              .string()
              .min(1)
              .describe(
                'A sentence describing the intent of the step and how to implement it [Markdown formatted]',
              ),
            codeSnippet: z
              .string()
              .optional()
              .describe(
                'Optional concise and minimal code snippet demonstrating the step. Keep it brief and focused. [Markdown formatted with ``` including the language]',
              ),
          }),
        )
        .describe(
          'Array of atomic steps that make up the recipe implementation. Each step should be clear and actionable.',
        ),
    },
    async ({
      name,
      summary,
      whenToUse,
      contextValidationCheckpoints,
      steps,
    }) => {
      if (!userContext) {
        throw new Error('User context is required to create recipes');
      }

      const recipesHexa = fastify.recipesHexa();

      const globalSpace = await getGlobalSpace(
        fastify,
        createOrganizationId(userContext.organizationId),
      );
      logger.info('Using global space for recipe creation', {
        spaceId: globalSpace.id,
        spaceName: globalSpace.name,
        organizationId: userContext.organizationId,
      });

      const recipe = await recipesHexa.getAdapter().captureRecipe({
        name,
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps: steps as RecipeStep[],
        organizationId: createOrganizationId(userContext.organizationId),
        userId: createUserId(userContext.userId),
        spaceId: globalSpace.id,
      });

      // Track analytics event
      analyticsAdapter.trackEvent(
        createUserId(userContext.userId),
        createOrganizationId(userContext.organizationId),
        'mcp_tool_call',
        { tool: `${mcpToolPrefix}_create_recipe` },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Recipe '${recipe.name}' has been created successfully.`,
          },
        ],
      };
    },
  );
}
