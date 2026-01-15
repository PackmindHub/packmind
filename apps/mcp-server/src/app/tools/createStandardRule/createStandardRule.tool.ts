import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  ADD_RULE_WORKFLOW_STEP_ORDER,
  ADD_RULE_WORKFLOW_STEPS,
  AddRuleWorkflowStep,
} from '../../prompts/packmind-add-rule-workflow';
import { registerMcpTool, ToolDependencies } from '../types';

const isAddRuleWorkflowStep = (value: string): value is AddRuleWorkflowStep =>
  Object.prototype.hasOwnProperty.call(ADD_RULE_WORKFLOW_STEPS, value);

export function registerCreateStandardRuleTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter } = dependencies;

  const addRuleWorkflowStepSchema = z
    .enum(ADD_RULE_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  type CreateStandardRuleInput = {
    step?: AddRuleWorkflowStep;
  };

  registerMcpTool(
    mcpServer,
    `create_standard_rule`,
    {
      title: 'Create Standard Rule',
      description:
        'Get step-by-step guidance for adding a new rule to an existing Packmind standard. Provide an optional step to retrieve a specific stage.',
      inputSchema: {
        step: addRuleWorkflowStepSchema.optional(),
      },
    },
    async (input: CreateStandardRuleInput) => {
      const { step } = input;
      const requestedStep = step ?? 'initial-request';

      if (!isAddRuleWorkflowStep(requestedStep)) {
        const availableSteps = Object.keys(ADD_RULE_WORKFLOW_STEPS).join(', ');
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
            tool: `create_standard_rule`,
            step: requestedStep,
          },
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: ADD_RULE_WORKFLOW_STEPS[requestedStep],
          },
        ],
      };
    },
  );
}
