import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EventTrackingAdapter } from '@packmind/amplitude';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { IEventTrackingPort } from '@packmind/types';
import { FastifyInstance } from 'fastify';
import {
  registerSaveRecipeTool,
  registerSaveStandardRuleTool,
  registerListStandardsTool,
  registerGetStandardDetailsTool,
  registerListRecipesTool,
  registerGetRecipeDetailsTool,
  registerListPackagesTool,
  registerShowPackageTool,
  registerCreateStandardTool,
  registerCreateRecipeTool,
  registerSaveStandardTool,
  registerCreateStandardRuleTool,
  registerOnboardingTool,
} from './tools';
import { UserContext } from './tools/types';
import { registerPushChangesTool } from './tools/pushChanges.tool';

const mcpToolPrefix = 'packmind';

export function createMCPServer(
  fastify: FastifyInstance,
  userContext?: UserContext,
) {
  const logger = new PackmindLogger('MCPServer', LogLevel.INFO);

  // Create server instance
  const mcpServer = new McpServer({
    name: 'packmind',
    version: '1.0.0',
  });

  logger.info('Create MCP server', {
    user: userContext ? userContext.userId : 'anonymous',
  });

  // Initialize analytics adapter
  const analyticsAdapter: IEventTrackingPort = new EventTrackingAdapter(logger);

  // Debug logging for fastify decorators
  logger.debug('Checking fastify decorators:', {
    hasHexaRegistry: typeof fastify.hexaRegistry,
    hasAccountsHexa: typeof fastify.accountsHexa,
    hasGitHexa: typeof fastify.gitHexa,
    hasRecipesHexa: typeof fastify.recipesHexa,
    hasAnalyticsHexa: typeof fastify.analyticsHexa,
    hasStandardsHexa: typeof fastify.standardsHexa,
    fastifyKeys: Object.keys(fastify).filter((key) => key.includes('Hexa')),
  });

  // Prepare dependencies for tools
  const toolDependencies = {
    fastify,
    userContext,
    analyticsAdapter,
    logger,
    mcpToolPrefix,
  };

  // Register all tools
  registerSaveRecipeTool(toolDependencies, mcpServer);
  registerSaveStandardRuleTool(toolDependencies, mcpServer);
  registerListStandardsTool(toolDependencies, mcpServer);
  registerGetStandardDetailsTool(toolDependencies, mcpServer);
  registerListRecipesTool(toolDependencies, mcpServer);
  registerGetRecipeDetailsTool(toolDependencies, mcpServer);
  registerListPackagesTool(toolDependencies, mcpServer);
  registerShowPackageTool(toolDependencies, mcpServer);
  registerCreateStandardTool(toolDependencies, mcpServer);
  registerCreateRecipeTool(toolDependencies, mcpServer);
  registerSaveStandardTool(toolDependencies, mcpServer);
  registerCreateStandardRuleTool(toolDependencies, mcpServer);
  registerOnboardingTool(toolDependencies, mcpServer);
  registerPushChangesTool(toolDependencies, mcpServer);

  return mcpServer;
}
