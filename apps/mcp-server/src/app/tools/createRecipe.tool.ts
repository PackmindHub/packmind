import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  RECIPE_WORKFLOW_STEP_ORDER,
  RECIPE_WORKFLOW_STEPS,
  RecipeWorkflowStep,
} from '../prompts/packmind-recipe-workflow';
import { ToolDependencies } from './types';

const isRecipeWorkflowStep = (value: string): value is RecipeWorkflowStep =>
  Object.prototype.hasOwnProperty.call(RECIPE_WORKFLOW_STEPS, value);

export function registerCreateRecipeTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter } = dependencies;

  const recipeWorkflowStepSchema = z
    .enum(RECIPE_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  mcpServer.tool(
    `create_recipe`,
    'Get step-by-step guidance for the Packmind recipe creation workflow. Provide an optional step to retrieve a specific stage.',
    {
      step: recipeWorkflowStepSchema.optional(),
    },
    async ({ step }) => {
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
