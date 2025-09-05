import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AccountsHexa } from '@packmind/accounts';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { StandardsHexa } from '@packmind/standards';
import { HexaRegistry, PackmindLogger, LogLevel } from '@packmind/shared';
import { RecipesUsageHexa } from '@packmind/analytics';

const logger = new PackmindLogger('HexaRegistryPlugin', LogLevel.INFO);

/**
 * Fastify plugin to register and initialize the HexaRegistry with domain hexas.
 *
 * This plugin:
 * - Creates an HexaRegistry instance
 * - Registers all domain hexas in dependency order
 * - Initializes the registry with the TypeORM DataSource from fastify.orm
 * - Makes the registry and individual hexas accessible via fastify decorators
 *
 * Usage:
 * ```typescript
 * await fastify.register(registerHexaRegistry);
 *
 * // Access the registry
 * const registry = fastify.hexaRegistry;
 *
 * // Access individual hexas
 * const recipesHexa = fastify.recipesHexa;
 * ```
 */
async function hexaRegistryPlugin(fastify: FastifyInstance) {
  logger.info('Registering HexaRegistry plugin');

  try {
    // Create the HexaRegistry instance
    const registry = new HexaRegistry();
    logger.debug('HexaRegistry instance created');

    // Register domain hexas in dependency order
    // AccountsHexa has no dependencies, GitHexa may depend on Accounts, RecipesHexa depends on Git, StandardsHexa depends on Git
    registry.register(AccountsHexa);
    logger.debug('AccountsHexa registered');
    registry.register(GitHexa);
    logger.debug('GitHexa registered');
    registry.register(RecipesHexa);
    logger.debug('RecipesHexa registered');
    registry.register(StandardsHexa);
    logger.debug('StandardsHexa registered');
    registry.register(RecipesUsageHexa);
    logger.debug('RecipesUsageHexa registered');

    logger.debug('Domain hexas registered successfully');

    // Hook into Fastify ready event to initialize after database is ready
    fastify.addHook('onReady', async () => {
      logger.info('Initializing HexaRegistry with DataSource');

      if (!fastify.orm) {
        throw new Error(
          'Database connection (fastify.orm) not available. Ensure the database plugin is registered before HexaRegistry.',
        );
      }

      // Initialize the registry with the DataSource
      registry.init(fastify.orm);

      logger.info('HexaRegistry initialized successfully');
    });

    // Decorate Fastify instance with the registry
    fastify.decorate('hexaRegistry', registry);
    logger.debug('HexaRegistry decorator added');

    // Decorate Fastify instance with individual hexas for easy access
    // These functions check if the registry is initialized before accessing hexas
    fastify.decorate('accountsHexa', () => {
      logger.debug('accountsHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(AccountsHexa);
    });
    logger.debug('accountsHexa decorator added');

    fastify.decorate('gitHexa', () => {
      logger.debug('gitHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(GitHexa);
    });
    logger.debug('gitHexa decorator added');

    fastify.decorate('recipesHexa', () => {
      logger.debug('recipesHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(RecipesHexa);
    });
    logger.debug('recipesHexa decorator added');

    fastify.decorate('standardsHexa', () => {
      logger.debug('standardsHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(StandardsHexa);
    });
    logger.debug('standardsHexa decorator added');

    fastify.decorate('recipesUsageHexa', () => {
      logger.debug('recipesUsageHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(RecipesUsageHexa);
    });
    logger.debug('recipesHexa decorator added');
  } catch (error) {
    logger.error('Failed to register HexaRegistry plugin', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Export the plugin wrhexaed with fastify-plugin to ensure decorators are available globally
export const registerHexaRegistry = fp(hexaRegistryPlugin, {
  name: 'hexa-registry',
  dependencies: [], // No plugin dependencies, but database must be registered first
});

// TypeScript type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    hexaRegistry: HexaRegistry;
    accountsHexa: () => AccountsHexa;
    gitHexa: () => GitHexa;
    recipesHexa: () => RecipesHexa;
    recipesUsageHexa: () => RecipesUsageHexa;
    standardsHexa: () => StandardsHexa;
  }
}
