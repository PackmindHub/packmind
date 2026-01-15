import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createOrganizationId, createUserId } from '@packmind/types';
import { Configuration } from '@packmind/node-utils';
import { registerMcpTool, ToolDependencies } from '../types';

const DEFAULT_APP_WEB_URL = 'http://localhost:4200';

export function registerGenerateTrialActivationUrlTool(
  dependencies: ToolDependencies,
  mcpServer: McpServer,
) {
  const { fastify, userContext, analyticsAdapter, logger, mcpToolPrefix } =
    dependencies;

  registerMcpTool(
    mcpServer,
    `${mcpToolPrefix}_generate_trial_activation_url`,
    {
      title: 'Generate Trial Activation URL',
      description:
        'Get a URL to activate your trial account with email and password. Use this when ready to convert your trial to a permanent account.',
      inputSchema: {},
    },
    async () => {
      if (!userContext) {
        throw new Error('User context is required to generate activation URL');
      }

      const accountsHexa = fastify.accountsHexa();

      try {
        const userId = createUserId(userContext.userId);
        const organizationId = createOrganizationId(userContext.organizationId);

        // Generate the activation token
        const { activationToken } = await accountsHexa
          .getAdapter()
          .generateTrialActivationToken({
            userId,
            organizationId,
            source: 'mcp',
          });

        // Get the frontend URL from configuration
        const appWebUrl =
          (await Configuration.getConfig('APP_WEB_URL')) ?? DEFAULT_APP_WEB_URL;

        // Construct the activation URL
        const activationUrl = `${appWebUrl}/activate-account?token=${activationToken}`;

        // Track analytics event
        analyticsAdapter.trackEvent(userId, organizationId, 'mcp_tool_call', {
          tool: `${mcpToolPrefix}_generate_trial_activation_url`,
        });

        logger.info('Generated trial activation URL', {
          userId: userContext.userId,
          organizationId: userContext.organizationId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Your trial activation URL has been generated. Visit this link to set up your email and password:\n\n${activationUrl}\n\nThis link will expire in 5 minutes.`,
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to generate trial activation URL', {
          error: error instanceof Error ? error.message : String(error),
          userId: userContext.userId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Failed to generate activation URL: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
