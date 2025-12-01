import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa } from '@packmind/amplitude';
import { GitHexa } from '@packmind/git';
import { LinterHexa } from '@packmind/linter';
import { LlmHexa } from '@packmind/llm';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  BaseService,
  BaseServiceOpts,
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';
import { hexaPlugins } from './hexaPlugins';

const logger = new PackmindLogger('PackmindApp', LogLevel.INFO);

/**
 * Definition of hexas and services to initialize for the Packmind MCP Server application.
 * This defines the order and configuration of all hexas and infrastructure services.
 */
export interface PackmindAppDefinition {
  hexas: Array<
    new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
  >;
  services: Array<
    new (dataSource: DataSource, opts?: Partial<BaseServiceOpts>) => BaseService
  >;
}

/**
 * Get the list of hexas and services to register for the Packmind MCP Server application.
 * This centralizes the subscription/initialization logic for the MCP Server.
 *
 * Order matters:
 * - AccountsHexa has no dependencies
 * - JobsService has no dependencies
 * - GitHexa may depend on Accounts
 * - RecipesHexa depends on Git
 * - LinterHexa must come before StandardsHexa
 * - CodingAgentHexa must come before DeploymentsHexa
 *
 * @returns The hexas and services to register
 */
export function getPackmindAppDefinition(): PackmindAppDefinition {
  return {
    hexas: [
      AccountsHexa,
      AmplitudeHexa,
      LlmHexa,
      GitHexa,
      SpacesHexa,
      LinterHexa,
      RecipesHexa,
      StandardsHexa,
      CodingAgentHexa,
      DeploymentsHexa,
      AnalyticsHexa,
      ...hexaPlugins,
    ],
    services: [JobsService, PackmindEventEmitterService],
  };
}

/**
 * Initialize the HexaRegistry for the Packmind MCP Server application.
 * This function registers all hexas and services in the correct order
 * and initializes the registry with the provided DataSource.
 *
 * @param dataSource - The TypeORM DataSource for database operations
 * @returns The initialized HexaRegistry
 */
export async function initializePackmindApp(
  dataSource: DataSource,
): Promise<HexaRegistry> {
  logger.info('Initializing Packmind MCP Server application');

  const registry = new HexaRegistry();
  const definition = getPackmindAppDefinition();

  // Register domain hexas in dependency order
  for (const HexaClass of definition.hexas) {
    registry.register(HexaClass);
    logger.debug(`${HexaClass.name} registered`);
  }

  // Register all services
  for (const ServiceClass of definition.services) {
    registry.registerService(ServiceClass);
    logger.debug(`${ServiceClass.name} registered`);
  }

  // Initialize the registry with the DataSource
  await registry.init(dataSource);
  logger.info('Packmind MCP Server application initialized successfully');

  return registry;
}
