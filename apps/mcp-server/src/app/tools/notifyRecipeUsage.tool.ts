import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { z } from 'zod';
import { registerMcpTool, ToolDependencies } from './types';

export function registerNotifyRecipeUsageTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter } = dependencies;

  type NotifyRecipeUsageInput = {
    recipeSlugs: string[];
    aiAgent: string;
    gitRepo?: string;
    target?: string;
  };

  registerMcpTool(
    mcpServer,
    `notify_recipe_usage`,
    {
      title: 'Notify Recipe Usage',
      description:
        'Notify a reusable coding recipe deployed with Packmind has been used by an AI Agent such as GitHub Copilot, Claude Code or Cursor.',
      inputSchema: {
        recipeSlugs: z
          .array(z.string())
          .min(1)
          .describe('The slugs of the recipes that were used'),
        aiAgent: z
          .string()
          .describe(
            'The name of the AI Agent that used the recipes (ex: Cursor, Claude Code, GitHub Copilot)',
          ),
        gitRepo: z
          .string()
          .optional()
          .describe(
            'The git repository in "owner/repo" format where the recipes were used',
          ),
        target: z
          .string()
          .optional()
          .describe(
            'The path where the recipes are distributed (ex: /, /src/frontend/, /src/backend/)',
          ),
      },
    },
    async (input: NotifyRecipeUsageInput) => {
      const { recipeSlugs, aiAgent, gitRepo, target } = input;
      if (!userContext) {
        throw new Error('User context is required to track recipe usage');
      }

      const analyticsHexa = fastify.analyticsHexa();

      try {
        const usageRecords = await analyticsHexa.getAdapter().trackRecipeUsage({
          recipeSlugs: recipeSlugs,
          aiAgent,
          userId: userContext.userId,
          organizationId: userContext.organizationId,
          gitRepo,
          target,
        });

        // Track analytics event
        analyticsAdapter.trackEvent(
          createUserId(userContext.userId),
          createOrganizationId(userContext.organizationId),
          'mcp_tool_call',
          { tool: `notify_recipe_usage` },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Recipe usage tracked successfully. Created ${usageRecords.length} usage records for AI agent: ${aiAgent}${gitRepo ? ` in repository: ${gitRepo}` : ''}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to track recipe usage: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
