import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createOrganizationId,
  createRecipeId,
  createUserId,
  RecipeStep,
} from '@packmind/types';
import { z } from 'zod';
import {
  buildTrialActivationPrompt,
  buildTrialInstallPrompt,
  ensureDefaultPackageWithArtifact,
  isTrialUser,
  shouldPromptForTrialActivation,
} from './trialPackageUtils';
import { registerMcpTool, ToolDependencies } from './types';
import { getGlobalSpace } from './utils';

// Define step schema separately to avoid deep type instantiation
const commandStepSchema = z.object({
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

type SaveCommandInput = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
  packageSlugs?: string[];
};

export function registerSaveCommandTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `save_command`,
    {
      title: 'Save Command',
      description:
        'Create a new reusable command as a structured Packmind command. Do not call this tool directly—you need to first use the tool packmind_create_command.',
      inputSchema: {
        name: z.string().min(1).describe('The name of the command to create'),
        summary: z
          .string()
          .min(1)
          .describe(
            'A concise sentence describing the intent of this command (what it does) and its value (why it is useful) and when it is relevant to use it',
          ),
        whenToUse: z
          .array(z.string())
          .describe(
            'Array of scenarios when this command is applicable. Provide specific, actionable scenarios.',
          ),
        contextValidationCheckpoints: z
          .array(z.string())
          .describe(
            'Array of checkpoints to ensure the context is clarified enough before implementing the command steps. Each checkpoint should be a question or validation point.',
          ),
        steps: z
          .array(commandStepSchema)
          .describe(
            'Array of atomic steps that make up the command implementation. Each step should be clear and actionable.',
          ),
        packageSlugs: z
          .array(z.string())
          .optional()
          .describe(
            'Optional array of package slugs to add this command to after creation',
          ),
      },
    },
    async (input: SaveCommandInput) => {
      const {
        name,
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps,
        packageSlugs,
      } = input;
      if (!userContext) {
        throw new Error('User context is required to create commands');
      }

      const recipesHexa = fastify.recipesHexa();

      const globalSpace = await getGlobalSpace(
        fastify,
        createOrganizationId(userContext.organizationId),
      );
      logger.info('Using global space for command creation', {
        spaceId: globalSpace.id,
        spaceName: globalSpace.name,
        organizationId: userContext.organizationId,
      });

      // If packageSlugs provided, use captureRecipeWithPackages to save command
      if (packageSlugs && packageSlugs.length > 0) {
        const { recipe: command } = await recipesHexa
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
            source: 'mcp',
          });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `save_command` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Command '${command.name}' has been created successfully and added to ${packageSlugs.length} package(s).`,
            },
          ],
        };
      }

      // Otherwise use regular captureRecipe to save command
      const command = await recipesHexa.getAdapter().captureRecipe({
        name,
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps: steps as RecipeStep[],
        organizationId: createOrganizationId(userContext.organizationId),
        userId: createUserId(userContext.userId),
        spaceId: globalSpace.id,
        source: 'mcp',
      });

      // Track analytics event
      analyticsAdapter.trackEvent(
        createUserId(userContext.userId),
        createOrganizationId(userContext.organizationId),
        'mcp_tool_call',
        { tool: `save_command` },
      );

      // For trial users, ensure the command is added to the Default package
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
          { recipeId: createRecipeId(command.id) },
          logger,
        );
      }

      const baseMessage = `Command '${command.name}' has been created successfully.`;

      if (trialPackageSlug) {
        const shouldPromptActivation = await shouldPromptForTrialActivation(
          fastify,
          createUserId(userContext.userId),
        );

        const activationPrompt = shouldPromptActivation
          ? `\n\n${buildTrialActivationPrompt()}`
          : '';

        return {
          content: [
            {
              type: 'text',
              text: `${baseMessage}\n\n${buildTrialInstallPrompt(trialPackageSlug)}${activationPrompt}`,
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
