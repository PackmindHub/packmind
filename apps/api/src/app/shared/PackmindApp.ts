import {
  AccountsHexa,
  AccountsHexaOpts,
  ApiKeyService,
} from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa } from '@packmind/amplitude';
import { GitHexa } from '@packmind/git';
import { LinterHexa } from '@packmind/linter';
import {
  BaseHexa,
  BaseHexaOpts,
  BaseService,
  BaseServiceOpts,
  HexaRegistry,
  JobsService,
} from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';

/**
 * Configuration for PackmindApp API initialization.
 */
export interface PackmindAppApiConfig {
  /**
   * ApiKeyService instance for AccountsHexa authentication
   */
  apiKeyService: ApiKeyService;
}

/**
 * Definition of hexas and services to initialize for the Packmind API application.
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
 * Get the list of hexas and services to register for the Packmind API application.
 * This centralizes the subscription/initialization logic for the API.
 *
 * Order matters:
 * - SpacesHexa must come before AccountsHexa (AccountsHexa depends on SpacesHexa)
 * - LinterHexa must come before StandardsHexa (StandardsHexa depends on LinterHexa)
 * - CodingAgentHexa must come before DeploymentsHexa
 *
 * @returns The hexas and services to register
 */
export function getPackmindAppDefinition(): PackmindAppDefinition {
  return {
    hexas: [
      SpacesHexa, // Must come before AccountsHexa (AccountsHexa depends on SpacesHexa)
      AccountsHexa,
      AmplitudeHexa,
      GitHexa,
      RecipesHexa,
      AnalyticsHexa,
      LinterHexa, // Must come before StandardsHexa (StandardsHexa depends on LinterHexa)
      StandardsHexa,
      CodingAgentHexa,
      DeploymentsHexa,
    ],
    services: [JobsService],
  };
}

/**
 * Initialize the HexaRegistry for the Packmind API application.
 * This function registers all hexas and services in the correct order
 * and initializes the registry with the provided DataSource.
 *
 * @param dataSource - The TypeORM DataSource for database operations
 * @param config - API-specific configuration (apiKeyService for AccountsHexa)
 * @returns The initialized HexaRegistry
 */
export async function initializePackmindApp(
  dataSource: DataSource,
  config: PackmindAppApiConfig,
): Promise<HexaRegistry> {
  const registry = new HexaRegistry();
  const definition = getPackmindAppDefinition();

  // Register all hexas in the specified order
  for (const HexaClass of definition.hexas) {
    if (HexaClass === AccountsHexa) {
      // Register AccountsHexa with apiKeyService option
      registry.register(AccountsHexa, {
        apiKeyService: config.apiKeyService,
      } as Partial<AccountsHexaOpts>);
    } else {
      registry.register(HexaClass);
    }
  }

  // Register JobsService
  registry.registerService(JobsService);

  // Initialize the registry with the DataSource
  await registry.init(dataSource);

  return registry;
}
