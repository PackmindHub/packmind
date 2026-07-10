import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EventTrackingAdapter } from '@packmind/amplitude';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { IEventTrackingPort } from '@packmind/types';
import { FastifyInstance } from 'fastify';
import {
  registerSaveCommandTool,
  registerSaveStandardRuleTool,
  registerListStandardsTool,
  registerGetStandardDetailsTool,
  registerListCommandsTool,
  registerGetCommandDetailsTool,
  registerListPackagesTool,
  registerShowPackageTool,
  registerCreateStandardTool,
  registerCreateCommandTool,
  registerSaveStandardTool,
  registerCreateStandardRuleTool,
  registerOnboardingTool,
  registerInstallPackageTool,
  registerRenderPackageTool,
} from './tools';
import { UserContext } from './tools/types';

const mcpToolPrefix = 'packmind';

export async function createMCPServer(
  fastify: FastifyInstance,
  userContext?: UserContext,
): Promise<McpServer> {
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
  registerSaveCommandTool(toolDependencies, mcpServer);
  registerSaveStandardRuleTool(toolDependencies, mcpServer);
  registerListStandardsTool(toolDependencies, mcpServer);
  registerGetStandardDetailsTool(toolDependencies, mcpServer);
  registerListCommandsTool(toolDependencies, mcpServer);
  registerGetCommandDetailsTool(toolDependencies, mcpServer);
  registerListPackagesTool(toolDependencies, mcpServer);
  registerShowPackageTool(toolDependencies, mcpServer);
  registerCreateStandardTool(toolDependencies, mcpServer);
  registerCreateCommandTool(toolDependencies, mcpServer);
  registerSaveStandardTool(toolDependencies, mcpServer);
  registerCreateStandardRuleTool(toolDependencies, mcpServer);
  registerOnboardingTool(toolDependencies, mcpServer);
  registerInstallPackageTool(toolDependencies, mcpServer);
  registerRenderPackageTool(toolDependencies, mcpServer);

  return mcpServer;
}
