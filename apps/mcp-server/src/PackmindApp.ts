import {
  AccountsHexa,
  AccountsHexaOpts,
  IJwtService,
} from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { AmplitudeHexa, LinterHexa, mcpHexaPlugins } from '@packmind/editions';
import { GitHexa } from '@packmind/git';
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
import { SkillsHexa } from '@packmind/skills';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';

const logger = new PackmindLogger('PackmindApp', LogLevel.INFO);

/**
 * JWT service implementation for the MCP server.
 * Uses the jsonwebtoken library with the JWT_SECRET environment variable.
 */
class McpJwtService implements IJwtService {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default';
  }

  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string | number },
  ): string {
    const signOptions: jwt.SignOptions = {};
    if (options?.expiresIn) {
      // Cast to satisfy jwt.SignOptions type which expects string | number
      signOptions.expiresIn = options.expiresIn as jwt.SignOptions['expiresIn'];
    }
    return jwt.sign(payload, this.secret, signOptions);
  }

  verify(token: string): Record<string, unknown> {
    return jwt.verify(token, this.secret) as Record<string, unknown>;
  }
}

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
      SkillsHexa,
      CodingAgentHexa,
      DeploymentsHexa,
      ...mcpHexaPlugins,
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

  // Create JWT service for AccountsHexa
  const jwtService = new McpJwtService();

  // Register domain hexas in dependency order
  for (const HexaClass of definition.hexas) {
    if (HexaClass === AccountsHexa) {
      // Register AccountsHexa with jwtService for trial activation support
      registry.register(AccountsHexa, {
        jwtService,
      } as Partial<AccountsHexaOpts>);
      logger.debug('AccountsHexa registered with jwtService');
    } else {
      registry.register(HexaClass);
      logger.debug(`${HexaClass.name} registered`);
    }
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
