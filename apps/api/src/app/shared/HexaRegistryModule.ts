import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HexaRegistry, BaseHexa } from '@packmind/shared';

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
      exports: [HEXA_REGISTRY_TOKEN, ...options.hexas],
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
      useFactory: async (dataSource: DataSource): Promise<HexaRegistry> => {
        const registry = new HexaRegistry();

        // Register all hexa types in the specified order
        for (const HexaClass of options.hexas) {
          registry.register(HexaClass);
        }

        // Initialize the registry with the DataSource (synchronous phase)
        registry.init(dataSource);

        // Initialize async dependencies (e.g., job queues)
        await registry.initAsync();

        // Wire up cross-domain dependencies after all hexas are initialized
        // This ensures AccountsHexa has access to Git, Standards, and Deployments ports
        HexaRegistryModule.wireCrossDomainDependencies(registry);

        return registry;
      },
      inject: [DataSource],
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

    return providers;
  }

  /**
   * Wire up cross-domain dependencies after all hexas are initialized.
   * This method uses getByName to avoid circular dependency issues.
   */
  private static wireCrossDomainDependencies(registry: HexaRegistry): void {
    // Get hexas by name to avoid import cycles
    const accountsHexa = registry.getByName('AccountsHexa');
    const gitHexa = registry.getByName('GitHexa');
    const standardsHexa = registry.getByName('StandardsHexa');
    const deploymentsHexa = registry.getByName('DeploymentsHexa');

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
      'getDeploymentsUseCases' in deploymentsHexa
    ) {
      accountsHexa.setDeploymentPort(
        (
          deploymentsHexa as unknown as {
            getDeploymentsUseCases: () => unknown;
          }
        ).getDeploymentsUseCases(),
      );
    }
  }

  /**
   * Cleanup method called when the module is being destroyed
   */
  async onModuleDestroy() {
    // The registry will handle cleanup of all hexas when needed
  }
}
