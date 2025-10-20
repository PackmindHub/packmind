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
   * Cleanup method called when the module is being destroyed
   */
  async onModuleDestroy() {
    // The registry will handle cleanup of all hexas when needed
  }
}
