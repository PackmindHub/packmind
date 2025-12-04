import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  RECIPE_WORKFLOW_STEP_ORDER,
  RECIPE_WORKFLOW_STEPS,
  RecipeWorkflowStep,
} from '../prompts/packmind-recipe-workflow';
import { registerMcpTool, ToolDependencies } from './types';

const isRecipeWorkflowStep = (value: string): value is RecipeWorkflowStep =>
  Object.prototype.hasOwnProperty.call(RECIPE_WORKFLOW_STEPS, value);

const stepSchema = z
  .enum(RECIPE_WORKFLOW_STEP_ORDER)
  .optional()
  .describe(
    'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
  );

type CreateRecipeInput = {
  step?: (typeof RECIPE_WORKFLOW_STEP_ORDER)[number];
};

export function registerCreateRecipeTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `create_recipe`,
    {
      title: 'Create Recipe',
      description:
        'Get step-by-step guidance for the Packmind recipe creation workflow. Provide an optional step to retrieve a specific stage.',
      inputSchema: {
        step: stepSchema,
      },
    },
    async (input: CreateRecipeInput) => {
      const { step } = input;
      const requestedStep = step ?? 'initial-request';

      if (!isRecipeWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(RECIPE_WORKFLOW_STEPS).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Unknown workflow step '${requestedStep}'. Available steps: ${availableSteps}`,
            },
          ],
        };
      }

      // Track analytics event
      if (userContext) {
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          {
            tool: `create_recipe`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: RECIPE_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );
}
