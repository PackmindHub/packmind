import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createOrganizationId,
  createRecipeId,
  createUserId,
  RecipeStep,
} from '@packmind/types';
import { z } from 'zod';
import {
  buildTrialInstallPrompt,
  ensureDefaultPackageWithArtifact,
  isTrialUser,
} from './trialPackageUtils';
import { registerMcpTool, ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

// Define step schema separately to avoid deep type instantiation
const recipeStepSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe('The name/title of the step (e.g., "Setup Dependencies")'),
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
});

type SaveRecipeInput = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
  packageSlugs?: string[];
};

export function registerSaveRecipeTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `save_recipe`,
    {
      title: 'Save Recipe',
      description:
        'Create a new reusable recipe as a structured Packmind recipe. Do not call this tool directly—you need to first use the tool packmind_create_recipe.',
      inputSchema: {
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
          .array(recipeStepSchema)
          .describe(
            'Array of atomic steps that make up the recipe implementation. Each step should be clear and actionable.',
          ),
        packageSlugs: z
          .array(z.string())
          .optional()
          .describe(
            'Optional array of package slugs to add this recipe to after creation',
          ),
      },
    },
    async (input: SaveRecipeInput) => {
      const {
        name,
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps,
        packageSlugs,
      } = input;
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

      // If packageSlugs provided, use captureRecipeWithPackages
      if (packageSlugs && packageSlugs.length > 0) {
        const { recipe } = await recipesHexa
          .getAdapter()
          .captureRecipeWithPackages({
            name,
            summary,
            whenToUse,
            contextValidationCheckpoints,
            steps: steps as RecipeStep[],
            packageSlugs,
            organizationId: userContext.organizationId,
            userId: userContext.userId,
            spaceId: globalSpace.id,
          });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `save_recipe` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Recipe '${recipe.name}' has been created successfully and added to ${packageSlugs.length} package(s).`,
            },
          ],
        };
      }

      // Otherwise use regular captureRecipe
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
        { tool: `save_recipe` },
      );

      // For trial users, ensure the recipe is added to the Default package
      let trialPackageSlug: string | null = null;
      const isTrial = await isTrialUser(
        fastify,
        createUserId(userContext.userId),
      );

      if (isTrial) {
        logger.info('Trial user detected, ensuring Default package exists', {
          userId: userContext.userId,
        });

        trialPackageSlug = await ensureDefaultPackageWithArtifact(
          fastify,
          userContext,
          globalSpace.id,
          { recipeId: createRecipeId(recipe.id) },
          logger,
        );
      }

      const baseMessage = `Recipe '${recipe.name}' has been created successfully.`;

      if (trialPackageSlug) {
        return {
          content: [
            {
              type: 'text',
              text: `${baseMessage}\n\n${buildTrialInstallPrompt(trialPackageSlug)}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: baseMessage,
          },
        ],
      };
    },
  );
}
