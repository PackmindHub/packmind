import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  COMMAND_WORKFLOW_STEP_ORDER,
  COMMAND_WORKFLOW_STEPS,
  CommandWorkflowStep,
} from '../../prompts/packmind-recipe-workflow';
import { registerMcpTool, ToolDependencies } from '../types';

const isCommandWorkflowStep = (value: string): value is CommandWorkflowStep =>
  Object.prototype.hasOwnProperty.call(COMMAND_WORKFLOW_STEPS, value);

const stepSchema = z
  .enum(COMMAND_WORKFLOW_STEP_ORDER)
  .optional()
  .describe(
    'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
  );

type CreateCommandInput = {
  step?: (typeof COMMAND_WORKFLOW_STEP_ORDER)[number];
};

export function registerCreateCommandTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `create_command`,
    {
      title: 'Create Command',
      description:
        'Get step-by-step guidance for the Packmind Command creation workflow. Provide an optional step to retrieve a specific stage.',
      inputSchema: {
        step: stepSchema,
      },
    },
    async (input: CreateCommandInput) => {
      const { step } = input;
      const requestedStep = step ?? 'initial-request';

      if (!isCommandWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(COMMAND_WORKFLOW_STEPS).join(', ');
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
            tool: `create_command`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: COMMAND_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );
}
