import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { HexaRegistry, BaseHexa } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { DeploymentsHexa } from '@packmind/deployments';
import { StandardsHexa } from '@packmind/standards';
import { AnalyticsHexa } from '@packmind/analytics';
import { AccountsHexa, AccountsHexaOpts } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  IDeploymentPort,
  IRecipesPort,
  IStandardsPort,
  IGitPort,
  ISpacesPort,
  ILinterPort,
  ICodingAgentPort,
  UserProvider,
  OrganizationProvider,
} from '@packmind/types';
import { ApiKeyServiceProvider } from './ApiKeyServiceProvider';

/**
 * Configuration interface for HexaRegistry integration with NestJS
 */
export interface HexaRegistryModuleOptions {
  /**
   * Array of hexa constructor classes in dependency order
   * Order matters for instantiation - dependencies should come first
   * e.g., [AccountsHexa, GitHexa, RecipesHexa]
   */
  hexas: Array<new (registry: HexaRegistry) => BaseHexa>;
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
   * Register the HexaRegistry module with domain hexas
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
        ACCOUNTS_ADAPTER_TOKEN,
        DEPLOYMENT_ADAPTER_TOKEN,
        RECIPES_ADAPTER_TOKEN,
        STANDARDS_ADAPTER_TOKEN,
        GIT_ADAPTER_TOKEN,
        SPACES_ADAPTER_TOKEN,
        LINTER_ADAPTER_TOKEN,
        CODING_AGENT_ADAPTER_TOKEN,
      ],
    };
  }

  /**
   * Type guard to check if a hexa has setGitPort method
   */
  private static hasSetGitPort(
    hexa: unknown,
  ): hexa is { setGitPort: (port: unknown) => void } {
    return hexa != null && typeof hexa === 'object' && 'setGitPort' in hexa;
  }

  /**
   * Type guard to check if a hexa has setStandardsPort method
   */
  private static hasSetStandardsPort(
    hexa: unknown,
  ): hexa is { setStandardsPort: (port: unknown) => void } {
    return (
      hexa != null && typeof hexa === 'object' && 'setStandardsPort' in hexa
    );
  }

  /**
   * Type guard to check if a hexa has setDeploymentPort method
   */
  private static hasSetDeploymentPort(
    hexa: unknown,
  ): hexa is { setDeploymentPort: (port: unknown) => void } {
    return (
      hexa != null && typeof hexa === 'object' && 'setDeploymentPort' in hexa
    );
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
        const registry = new HexaRegistry();

        // Register all hexa types in the specified order
        // For AccountsHexa, we need to pass the apiKeyService option
        for (const HexaClass of options.hexas) {
          if (HexaClass === AccountsHexa) {
            // Create ApiKeyService for AccountsHexa
            const logger = new PackmindLogger('AccountsHexa');
            const apiKeyServiceProvider = new ApiKeyServiceProvider();
            const apiKeyService = apiKeyServiceProvider.createApiKeyService(
              jwtService,
              logger,
            );

            // Register AccountsHexa with apiKeyService option
            // Cast to AccountsHexa to allow passing AccountsHexaOpts
            registry.register(AccountsHexa, {
              apiKeyService,
            } as Partial<AccountsHexaOpts>);
          } else {
            registry.register(HexaClass);
          }
        }

        // Initialize the registry with the DataSource (synchronous phase)
        registry.init(dataSource);

        // Initialize async dependencies (e.g., job queues)
        await registry.initAsync();

        // Wire up cross-domain dependencies after all hexas are initialized
        // This ensures AccountsHexa has access to Git, Standards, and Deployments ports
        await HexaRegistryModule.wireCrossDomainDependencies(registry);

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

    // Provide adapters as injectable services
    // Accounts adapter
    providers.push({
      provide: ACCOUNTS_ADAPTER_TOKEN,
      useFactory: (registry: HexaRegistry): IAccountsPort | null => {
        try {
          const accountsHexa = registry.getByName('AccountsHexa');
          if (accountsHexa && 'getAccountsAdapter' in accountsHexa) {
            return (
              accountsHexa as { getAccountsAdapter: () => IAccountsPort }
            ).getAccountsAdapter();
          }
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
          const deploymentsHexa = registry.getByName('DeploymentsHexa');
          if (
            deploymentsHexa &&
            ('getDeploymentsAdapter' in deploymentsHexa ||
              'getDeploymentsUseCases' in deploymentsHexa)
          ) {
            if ('getDeploymentsAdapter' in deploymentsHexa) {
              return (
                deploymentsHexa as {
                  getDeploymentsAdapter: () => IDeploymentPort;
                }
              ).getDeploymentsAdapter();
            }
            return (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
          }
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
          const recipesHexa = registry.getByName('RecipesHexa');
          if (recipesHexa && 'getRecipesAdapter' in recipesHexa) {
            return (
              recipesHexa as { getRecipesAdapter: () => IRecipesPort }
            ).getRecipesAdapter();
          }
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
          const standardsHexa = registry.getByName('StandardsHexa');
          if (standardsHexa && 'getStandardsAdapter' in standardsHexa) {
            return (
              standardsHexa as { getStandardsAdapter: () => IStandardsPort }
            ).getStandardsAdapter();
          }
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
          const gitHexa = registry.getByName('GitHexa');
          if (gitHexa && 'getGitAdapter' in gitHexa) {
            return (
              gitHexa as { getGitAdapter: () => IGitPort }
            ).getGitAdapter();
          }
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
          const spacesHexa = registry.getByName('SpacesHexa');
          if (spacesHexa && 'getSpacesAdapter' in spacesHexa) {
            return (
              spacesHexa as { getSpacesAdapter: () => ISpacesPort }
            ).getSpacesAdapter();
          }
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
          const linterHexa = registry.getByName('LinterHexa');
          if (linterHexa && 'getLinterAdapter' in linterHexa) {
            return (
              linterHexa as { getLinterAdapter: () => ILinterPort }
            ).getLinterAdapter();
          }
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
          const codingAgentHexa = registry.getByName('CodingAgentHexa');
          if (codingAgentHexa && 'getCodingAgentAdapter' in codingAgentHexa) {
            return (
              codingAgentHexa as {
                getCodingAgentAdapter: () => ICodingAgentPort;
              }
            ).getCodingAgentAdapter();
          }
        } catch {
          // CodingAgentHexa not available
        }
        return null;
      },
      inject: [HEXA_REGISTRY_TOKEN],
    });

    return providers;
  }

  /**
   * Wire up cross-domain dependencies after all hexas are initialized.
   * This method uses getByName to avoid circular dependency issues.
   * All cross-domain dependency setup is centralized here instead of in service constructors.
   */
  private static async wireCrossDomainDependencies(
    registry: HexaRegistry,
  ): Promise<void> {
    // Get hexas by name to avoid import cycles
    const accountsHexa = registry.getByName('AccountsHexa');
    const gitHexa = registry.getByName('GitHexa');
    const standardsHexa: StandardsHexa = registry.getByName('StandardsHexa');
    const deploymentsHexa: DeploymentsHexa =
      registry.getByName('DeploymentsHexa');
    const recipesHexa: RecipesHexa = registry.getByName('RecipesHexa');
    const linterHexa = registry.getByName('LinterHexa');
    const spacesHexa = registry.getByName('SpacesHexa');
    const analyticsHexa: AnalyticsHexa = registry.getByName('AnalyticsHexa');

    // ========================================
    // AccountsHexa dependencies
    // ========================================
    // Inject ports into AccountsHexa for onboarding status use case
    if (
      HexaRegistryModule.hasSetGitPort(accountsHexa) &&
      gitHexa &&
      'getGitAdapter' in gitHexa
    ) {
      accountsHexa.setGitPort(
        (
          gitHexa as unknown as { getGitAdapter: () => unknown }
        ).getGitAdapter(),
      );
    }

    if (
      HexaRegistryModule.hasSetStandardsPort(accountsHexa) &&
      standardsHexa &&
      'getStandardsAdapter' in standardsHexa
    ) {
      accountsHexa.setStandardsPort(
        (
          standardsHexa as unknown as { getStandardsAdapter: () => unknown }
        ).getStandardsAdapter(),
      );
    }

    if (
      HexaRegistryModule.hasSetDeploymentPort(accountsHexa) &&
      deploymentsHexa &&
      ('getDeploymentsAdapter' in deploymentsHexa ||
        'getDeploymentsUseCases' in deploymentsHexa)
    ) {
      const deploymentPort =
        'getDeploymentsAdapter' in deploymentsHexa
          ? (
              deploymentsHexa as {
                getDeploymentsAdapter: () => IDeploymentPort;
              }
            ).getDeploymentsAdapter()
          : (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
      accountsHexa.setDeploymentPort(deploymentPort);
    }

    // ========================================
    // GitHexa dependencies
    // ========================================
    // Set user and organization providers for GitHexa
    if (
      gitHexa &&
      accountsHexa &&
      'setUserProvider' in gitHexa &&
      'setOrganizationProvider' in gitHexa &&
      'getUserProvider' in accountsHexa &&
      'getOrganizationProvider' in accountsHexa
    ) {
      (
        gitHexa as {
          setUserProvider: (provider: UserProvider) => void;
          setOrganizationProvider: (provider: OrganizationProvider) => void;
        }
      ).setUserProvider(
        (
          accountsHexa as { getUserProvider: () => UserProvider }
        ).getUserProvider(),
      );
      (
        gitHexa as {
          setOrganizationProvider: (provider: OrganizationProvider) => void;
        }
      ).setOrganizationProvider(
        (
          accountsHexa as {
            getOrganizationProvider: () => OrganizationProvider;
          }
        ).getOrganizationProvider(),
      );
    }

    // Set deployments adapter for GitHexa
    if (
      gitHexa &&
      deploymentsHexa &&
      'setDeploymentsAdapter' in gitHexa &&
      ('getDeploymentsAdapter' in deploymentsHexa ||
        'getDeploymentsUseCases' in deploymentsHexa)
    ) {
      const deploymentPort =
        'getDeploymentsAdapter' in deploymentsHexa
          ? (
              deploymentsHexa as {
                getDeploymentsAdapter: () => IDeploymentPort;
              }
            ).getDeploymentsAdapter()
          : (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
      (
        gitHexa as {
          setDeploymentsAdapter: (adapter: IDeploymentPort) => void;
        }
      ).setDeploymentsAdapter(deploymentPort);
    }

    // ========================================
    // DeploymentsHexa dependencies
    // ========================================
    // Set account providers for DeploymentsHexa
    if (
      deploymentsHexa &&
      accountsHexa &&
      'setAccountProviders' in deploymentsHexa &&
      'getUserProvider' in accountsHexa &&
      'getOrganizationProvider' in accountsHexa
    ) {
      deploymentsHexa.setAccountProviders(
        (
          accountsHexa as { getUserProvider: () => UserProvider }
        ).getUserProvider(),
        (
          accountsHexa as {
            getOrganizationProvider: () => OrganizationProvider;
          }
        ).getOrganizationProvider(),
      );
    }

    // Set spaces adapter for DeploymentsHexa
    if (
      deploymentsHexa &&
      spacesHexa &&
      'setSpacesAdapter' in deploymentsHexa &&
      'getSpacesAdapter' in spacesHexa
    ) {
      const spacesAdapter = (
        spacesHexa as { getSpacesAdapter: () => ISpacesPort }
      ).getSpacesAdapter();
      deploymentsHexa.setSpacesAdapter(spacesAdapter);
    }

    // Set recipes port for DeploymentsHexa (bidirectional dependency)
    if (deploymentsHexa && recipesHexa && 'setRecipesPort' in deploymentsHexa) {
      deploymentsHexa.setRecipesPort(recipesHexa);
    }

    // Set standards port for DeploymentsHexa
    if (
      deploymentsHexa &&
      standardsHexa &&
      'setStandardsPort' in deploymentsHexa &&
      'getStandardsAdapter' in standardsHexa
    ) {
      deploymentsHexa.setStandardsPort(standardsHexa);
    }

    // ========================================
    // RecipesHexa dependencies
    // ========================================
    // Set deployment port for RecipesHexa (bidirectional dependency)
    // Note: This is async but we handle it in the async initialization phase
    if (
      recipesHexa &&
      deploymentsHexa &&
      'setDeploymentPort' in recipesHexa &&
      ('getDeploymentsAdapter' in deploymentsHexa ||
        'getDeploymentsUseCases' in deploymentsHexa)
    ) {
      const deploymentPort =
        'getDeploymentsAdapter' in deploymentsHexa
          ? (
              deploymentsHexa as {
                getDeploymentsAdapter: () => IDeploymentPort;
              }
            ).getDeploymentsAdapter()
          : (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
      // setDeploymentPort is async
      try {
        await (
          recipesHexa as {
            setDeploymentPort: (port: IDeploymentPort) => Promise<void>;
          }
        ).setDeploymentPort(deploymentPort);
      } catch (error) {
        // Log error but don't fail initialization
        console.error(
          'Failed to set deployment port on RecipesHexa',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // ========================================
    // StandardsHexa dependencies
    // ========================================
    // Set deployments query adapter for StandardsHexa
    if (
      standardsHexa &&
      deploymentsHexa &&
      'setDeploymentsQueryAdapter' in standardsHexa &&
      ('getDeploymentsAdapter' in deploymentsHexa ||
        'getDeploymentsUseCases' in deploymentsHexa)
    ) {
      const deploymentPort =
        'getDeploymentsAdapter' in deploymentsHexa
          ? (
              deploymentsHexa as {
                getDeploymentsAdapter: () => IDeploymentPort;
              }
            ).getDeploymentsAdapter()
          : (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
      (
        standardsHexa as {
          setDeploymentsQueryAdapter: (adapter: IDeploymentPort) => void;
        }
      ).setDeploymentsQueryAdapter(deploymentPort);
    }

    // Set linter adapter for StandardsHexa
    if (
      standardsHexa &&
      linterHexa &&
      'setLinterAdapter' in standardsHexa &&
      'getLinterAdapter' in linterHexa
    ) {
      const linterAdapter = (
        linterHexa as { getLinterAdapter: () => ILinterPort }
      ).getLinterAdapter();
      (
        standardsHexa as {
          setLinterAdapter: (adapter: ILinterPort) => void;
        }
      ).setLinterAdapter(linterAdapter);
    }

    // ========================================
    // LinterHexa dependencies
    // ========================================
    // Set standards adapter for LinterHexa (bidirectional dependency)
    if (
      linterHexa &&
      standardsHexa &&
      'setStandardAdapter' in linterHexa &&
      'getStandardsAdapter' in standardsHexa
    ) {
      const standardsAdapter = (
        standardsHexa as { getStandardsAdapter: () => IStandardsPort }
      ).getStandardsAdapter();
      (
        linterHexa as {
          setStandardAdapter: (adapter: IStandardsPort) => void;
        }
      ).setStandardAdapter(standardsAdapter);
    }

    // ========================================
    // AnalyticsHexa dependencies
    // ========================================
    // Set recipes port for AnalyticsHexa
    if (
      analyticsHexa &&
      recipesHexa &&
      'setRecipesPort' in analyticsHexa &&
      'getRecipesAdapter' in recipesHexa
    ) {
      const recipesPort = (
        recipesHexa as { getRecipesAdapter: () => IRecipesPort }
      ).getRecipesAdapter();
      analyticsHexa.setRecipesPort(recipesPort);
    }

    // Set deployment port for AnalyticsHexa
    if (
      analyticsHexa &&
      deploymentsHexa &&
      'setDeploymentPort' in analyticsHexa &&
      ('getDeploymentsAdapter' in deploymentsHexa ||
        'getDeploymentsUseCases' in deploymentsHexa)
    ) {
      const deploymentPort =
        'getDeploymentsAdapter' in deploymentsHexa
          ? (
              deploymentsHexa as {
                getDeploymentsAdapter: () => IDeploymentPort;
              }
            ).getDeploymentsAdapter()
          : (
              deploymentsHexa as {
                getDeploymentsUseCases: () => IDeploymentPort;
              }
            ).getDeploymentsUseCases();
      analyticsHexa.setDeploymentPort(deploymentPort);
    }
  }

  /**
   * Cleanup method called when the module is being destroyed
   */
  async onModuleDestroy() {
    // The registry will handle cleanup of all hexas when needed
  }
}
