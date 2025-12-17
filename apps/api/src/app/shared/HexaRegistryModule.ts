import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsHexa } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa } from '@packmind/deployments';
import { GitHexa } from '@packmind/git';
import { LinterHexa } from '@packmind/linter';
import { LlmHexa } from '@packmind/llm';
import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  BaseService,
  BaseServiceOpts,
  HexaRegistry,
} from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import {
  IAccountsPort,
  ICodingAgentPort,
  IDeploymentPort,
  IGitPort,
  ILinterPort,
  ILlmPort,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { ApiKeyServiceProvider } from './ApiKeyServiceProvider';
import { initializePackmindApp } from './PackmindApp';

/**
 * Configuration interface for HexaRegistry integration with NestJS
 */
export interface HexaRegistryModuleOptions {
  /**
   * Array of hexa constructor classes in dependency order
   * Order matters for instantiation - dependencies should come first
   * e.g., [AccountsHexa, GitHexa, RecipesHexa]
   */
  hexas: Array<
    new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
  >;
  /**
   * Array of service constructor classes in dependency order
   * Order matters for instantiation - dependencies should come first
   * e.g., [JobsService]
   */
  services?: Array<
    new (dataSource: DataSource, opts?: Partial<BaseServiceOpts>) => BaseService
  >;
}

/**
 * Token constants for dependency injection
 */
export const HEXA_REGISTRY_TOKEN = 'HEXA_REGISTRY';
export const HEXA_REGISTRY_OPTIONS_TOKEN = 'HEXA_REGISTRY_OPTIONS';

/**
 * Adapter injection tokens
 */
export const ACCOUNTS_ADAPTER_TOKEN = 'ACCOUNTS_ADAPTER';
export const DEPLOYMENT_ADAPTER_TOKEN = 'DEPLOYMENT_ADAPTER';
export const RECIPES_ADAPTER_TOKEN = 'RECIPES_ADAPTER';
export const STANDARDS_ADAPTER_TOKEN = 'STANDARDS_ADAPTER';
export const GIT_ADAPTER_TOKEN = 'GIT_ADAPTER';
export const SPACES_ADAPTER_TOKEN = 'SPACES_ADAPTER';
export const LINTER_ADAPTER_TOKEN = 'LINTER_ADAPTER';
export const CODING_AGENT_ADAPTER_TOKEN = 'CODING_AGENT_ADAPTER';
export const LLM_ADAPTER_TOKEN = 'LLM_ADAPTER';

/**
 * NestJS Module for integrating HexaRegistry with dependency injection.
 *
 * This module provides:
 * - Global HexaRegistry instance
 * - Individual domain hexas as injectable services
 * - Automatic lifecycle management (initialization and cleanup)
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     HexaRegistryModule.register({
 *       hexas: [AccountsHexa, GitHexa, RecipesHexa]
 *     })
 *   ]
 * })
 * export class HexaModule {}
 * ```
 */
@Global()
@Module({})
export class HexaRegistryModule {
  /**
   * Register the HexaRegistry module with domain hexas and infrastructure services
   */
  static register(options: HexaRegistryModuleOptions): DynamicModule {
    const providers = HexaRegistryModule.createProviders(options);

    return {
      module: HexaRegistryModule,
      imports: [TypeOrmModule.forFeature([])], // Ensure TypeORM is available
      providers,
      exports: [
        HEXA_REGISTRY_TOKEN,
        ...options.hexas,
        ...(options.services || []),
        ACCOUNTS_ADAPTER_TOKEN,
        DEPLOYMENT_ADAPTER_TOKEN,
        RECIPES_ADAPTER_TOKEN,
        STANDARDS_ADAPTER_TOKEN,
        GIT_ADAPTER_TOKEN,
        SPACES_ADAPTER_TOKEN,
        LINTER_ADAPTER_TOKEN,
        CODING_AGENT_ADAPTER_TOKEN,
        LLM_ADAPTER_TOKEN,
      ],
    };
  }

  /**
   * Create all providers needed for the HexaRegistry integration
   */
  private static createProviders(
    options: HexaRegistryModuleOptions,
  ): Provider[] {
    const providers: Provider[] = [];

    // Provide the configuration options
    providers.push({
      provide: HEXA_REGISTRY_OPTIONS_TOKEN,
      useValue: options,
    });

    // Provide the HexaRegistry instance
    providers.push({
      provide: HEXA_REGISTRY_TOKEN,
      useFactory: async (
        dataSource: DataSource,
        jwtService: JwtService,
      ): Promise<HexaRegistry> => {
        // Create ApiKeyService for AccountsHexa
        const logger = new PackmindLogger('AccountsHexa');
        const apiKeyServiceProvider = new ApiKeyServiceProvider();
        const apiKeyService = apiKeyServiceProvider.createApiKeyService(
          jwtService,
          logger,
        );

        // Initialize using the centralized PackmindApp configuration
        // Pass jwtService for trial activation token support
        const registry = await initializePackmindApp(dataSource, {
          apiKeyService,
          jwtService,
        });

        return registry;
      },
      inject: [DataSource, JwtService],
    });

    // Provide individual domain hexas as injectable services by class reference
    for (const HexaClass of options.hexas) {
      providers.push({
        provide: HexaClass,
        useFactory: (registry: HexaRegistry) => {
          return registry.get(HexaClass);
        },
        inject: [HEXA_REGISTRY_TOKEN],
      });
    }

    // Provide individual services as injectable services by class reference
    if (options.services) {
      for (const ServiceClass of options.services) {
        providers.push({
          provide: ServiceClass,
          useFactory: (registry: HexaRegistry) => {
            return registry.getService(ServiceClass);
          },
          inject: [HEXA_REGISTRY_TOKEN],
        });
      }
    }

    // Provide adapters as injectable services
    // Accounts adapter
    providers.push({
      provide: ACCOUNTS_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IAccountsPort | null => {
        try {
          const accountsHexa = registry.get(AccountsHexa);
          return accountsHexa.getAdapter();
        } catch {
          // AccountsHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Deployment adapter
    providers.push({
      provide: DEPLOYMENT_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IDeploymentPort | null => {
        try {
          const deploymentsHexa = registry.get(DeploymentsHexa);
          return deploymentsHexa.getAdapter();
        } catch {
          // DeploymentsHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Recipes adapter
    providers.push({
      provide: RECIPES_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IRecipesPort | null => {
        try {
          const recipesHexa = registry.get(RecipesHexa);
          return recipesHexa.getAdapter();
        } catch {
          // RecipesHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Standards adapter
    providers.push({
      provide: STANDARDS_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IStandardsPort | null => {
        try {
          const standardsHexa = registry.get(StandardsHexa);
          return standardsHexa.getAdapter();
        } catch {
          // StandardsHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Git adapter
    providers.push({
      provide: GIT_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IGitPort | null => {
        try {
          const gitHexa = registry.get(GitHexa);
          return gitHexa.getAdapter();
        } catch {
          // GitHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Spaces adapter
    providers.push({
      provide: SPACES_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): ISpacesPort | null => {
        try {
          const spacesHexa = registry.get(SpacesHexa);
          return spacesHexa.getAdapter();
        } catch {
          // SpacesHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // Linter adapter
    providers.push({
      provide: LINTER_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): ILinterPort | null => {
        try {
          const linterHexa = registry.get(LinterHexa);
          return linterHexa.getAdapter();
        } catch {
          // LinterHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // CodingAgent adapter
    providers.push({
      provide: CODING_AGENT_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): ICodingAgentPort | null => {
        try {
          const codingAgentHexa = registry.get(CodingAgentHexa);
          return codingAgentHexa.getAdapter();
        } catch {
          // CodingAgentHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    // LLM adapter
    providers.push({
      provide: LLM_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): ILlmPort | null => {
        try {
          const llmHexa = registry.get(LlmHexa);
          return llmHexa.getAdapter();
        } catch {
          // LlmHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    return providers;
  }

  /**
   * Cleanup method called when the module is being destroyed
   */
  async onModuleDestroy() {
    // The registry will handle cleanup of all hexas when needed
  }
}
