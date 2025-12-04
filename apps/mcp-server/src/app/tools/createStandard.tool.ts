import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  STANDARD_WORKFLOW_STEP_ORDER,
  STANDARD_WORKFLOW_STEPS,
  StandardWorkflowStep,
} from '../prompts/packmind-standard-workflow';
import { registerMcpTool, ToolDependencies } from './types';

const isStandardWorkflowStep = (value: string): value is StandardWorkflowStep =>
  Object.prototype.hasOwnProperty.call(STANDARD_WORKFLOW_STEPS, value);

const stepSchema = z
  .enum(STANDARD_WORKFLOW_STEP_ORDER)
  .optional()
  .describe(
    'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
  );

type CreateStandardInput = {
  step?: (typeof STANDARD_WORKFLOW_STEP_ORDER)[number];
};

export function registerCreateStandardTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter } = dependencies;

  registerMcpTool(
    mcpServer,
    `create_standard`,
    {
      title: 'Create Standard',
      description:
        'Get step-by-step guidance for the Packmind standard creation workflow. Provide an optional step to retrieve a specific stage.',
      inputSchema: {
        step: stepSchema,
      },
    },
    async (input: CreateStandardInput) => {
      const { step } = input;
      const requestedStep = step ?? 'initial-request';

      if (!isStandardWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(STANDARD_WORKFLOW_STEPS).join(', ');
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
            tool: `create_standard`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: STANDARD_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );
}
