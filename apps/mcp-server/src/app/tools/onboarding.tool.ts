import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import packmindOnboardingAiInstructions from '../prompts/packmind-onboarding-ai-instructions';
import packmindOnboardingCodebaseAnalysis from '../prompts/packmind-onboarding-codebase-analysis';
import packmindOnboardingDocumentation from '../prompts/packmind-onboarding-documentation';
import packmindOnboardingGitHistory from '../prompts/packmind-onboarding-git-history';
import packmindOnboardingModeSelection from '../prompts/packmind-onboarding-mode-selection';
import packmindOnboardingWebResearch from '../prompts/packmind-onboarding-web-research';
import { registerMcpTool, ToolDependencies } from './types';

// Onboarding prompt content imported as strings
const ONBOARDING_PROMPTS = {
  'mode-selection': packmindOnboardingModeSelection,
  'codebase-analysis': packmindOnboardingCodebaseAnalysis,
  'git-history': packmindOnboardingGitHistory,
  documentation: packmindOnboardingDocumentation,
  'ai-instructions': packmindOnboardingAiInstructions,
  'web-research': packmindOnboardingWebResearch,
};

export function registerOnboardingTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { userContext, analyticsAdapter, logger } = dependencies;

  registerMcpTool(
    mcpServer,
    `onboarding`,
    {
      title: 'Onboarding',
      description:
        'Get onboarding workflows for coding standards creation. Returns mode selection if no workflow specified, or specific workflow content.',
      inputSchema: {
        workflow: z
          .string()
          .optional()
          .describe(
            'The workflow name to retrieve. Available: codebase-analysis, git-history, documentation, ai-instructions, web-research',
          ),
      },
    },
    async ({ workflow }: { workflow?: string }) => {
      try {
        // If no workflow specified, return mode selection
        logger.info(`Onboarding tool called with workflow: ${workflow}`);

        // Track analytics event
        if (userContext) {
          analyticsAdapter.trackEvent(
            createUserId(userContext.userId),
            createOrganizationId(userContext.organizationId),
            'mcp_tool_call',
            {
              tool: `onboarding`,
              step: workflow || 'mode-selection',
            },
          );
        }

        if (!workflow) {
          // Track onboarding start event
          if (userContext) {
            await analyticsAdapter.trackEvent(
              createUserId(userContext.userId),
              createOrganizationId(userContext.organizationId),
              'on_boarding_started',
              { source: 'mcp' },
            );
          }

          return {
            content: [
              {
                type: 'text',
                text: ONBOARDING_PROMPTS['mode-selection'],
              },
            ],
          };
        }

        // Check if the requested workflow exists
        if (workflow in ONBOARDING_PROMPTS) {
          return {
            content: [
              {
                type: 'text',
                text: ONBOARDING_PROMPTS[
                  workflow as keyof typeof ONBOARDING_PROMPTS
                ],
              },
            ],
          };
        }

        // Workflow not found
        return {
          content: [
            {
              type: 'text',
              text: `No workflow found for '${workflow}'. Available workflows: ${Object.keys(
                ONBOARDING_PROMPTS,
              )
                .filter((k) => k !== 'mode-selection')
                .join(', ')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to retrieve onboarding content: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
