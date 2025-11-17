import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import {
  ADD_RULE_WORKFLOW_STEP_ORDER,
  ADD_RULE_WORKFLOW_STEPS,
  AddRuleWorkflowStep,
} from '../prompts/packmind-add-rule-workflow';
import { ToolDependencies } from './types';

const isAddRuleWorkflowStep = (value: string): value is AddRuleWorkflowStep =>
  Object.prototype.hasOwnProperty.call(ADD_RULE_WORKFLOW_STEPS, value);

export function registerAddRuleToStandardWorkflowTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter, mcpToolPrefix } = dependencies;

  const addRuleWorkflowStepSchema = z
    .enum(ADD_RULE_WORKFLOW_STEP_ORDER)
    .describe(
      'Identifier of the workflow step to retrieve guidance for. Leave empty to start at the first step.',
    );

  mcpServer.tool(
    `${mcpToolPrefix}_add_rule_to_standard_workflow`,
    'Get step-by-step guidance for adding a new rule to an existing Packmind standard. Provide an optional step to retrieve a specific stage.',
    {
      step: addRuleWorkflowStepSchema.optional(),
    },
    async ({ step }) => {
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
            tool: `${mcpToolPrefix}_add_rule_to_standard_workflow`,
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
