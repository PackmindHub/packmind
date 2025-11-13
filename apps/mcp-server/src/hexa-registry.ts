import { AccountsHexa } from '@packmind/accounts';
import { AnalyticsHexa } from '@packmind/analytics';
import { DeploymentsHexa } from '@packmind/deployments';
import { GitHexa } from '@packmind/git';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { HexaRegistry, JobsService } from '@packmind/node-utils';
import { RecipesHexa } from '@packmind/recipes';
import { SpacesHexa } from '@packmind/spaces';
import { StandardsHexa } from '@packmind/standards';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import 'reflect-metadata';
import { initializePackmindApp } from './PackmindApp';

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
    // Hook into Fastify ready event to initialize after database is ready
    fastify.addHook('onReady', async () => {
      logger.info('Initializing HexaRegistry with DataSource');

      if (!fastify.orm) {
        throw new Error(
          'Database connection (fastify.orm) not available. Ensure the database plugin is registered before HexaRegistry.',
        );
      }

      // Initialize using the centralized PackmindApp configuration
      const registry = await initializePackmindApp(fastify.orm);

      // Decorate Fastify instance with the registry after initialization
      fastify.decorate('hexaRegistry', registry);
      logger.debug('HexaRegistry decorator added');

      logger.info('HexaRegistry initialized successfully');
    });

    // Decorate Fastify instance with individual hexas for easy access
    // These functions check if the registry is initialized before accessing hexas
    fastify.decorate('accountsHexa', () => {
      logger.debug('accountsHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(AccountsHexa);
    });
    logger.debug('accountsHexa decorator added');

    fastify.decorate('jobsService', () => {
      logger.debug('jobsService() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.getService(JobsService);
    });
    logger.debug('jobsService decorator added');

    fastify.decorate('gitHexa', () => {
      logger.debug('gitHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(GitHexa);
    });
    logger.debug('gitHexa decorator added');

    fastify.decorate('spacesHexa', () => {
      logger.debug('spacesHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(SpacesHexa);
    });
    logger.debug('spacesHexa decorator added');

    fastify.decorate('recipesHexa', () => {
      logger.debug('recipesHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(RecipesHexa);
    });
    logger.debug('recipesHexa decorator added');

    fastify.decorate('standardsHexa', () => {
      logger.debug('standardsHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(StandardsHexa);
    });
    logger.debug('standardsHexa decorator added');

    fastify.decorate('deploymentsHexa', () => {
      logger.debug('deploymentsHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(DeploymentsHexa);
    });
    logger.debug('deploymentsHexa decorator added');

    fastify.decorate('analyticsHexa', () => {
      logger.debug('analyticsHexa() called');
      if (!fastify.hexaRegistry || !fastify.hexaRegistry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return fastify.hexaRegistry.get(AnalyticsHexa);
    });
    logger.debug('analyticsHexa decorator added');
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
    jobsService: () => JobsService;
    gitHexa: () => GitHexa;
    spacesHexa: () => SpacesHexa;
    recipesHexa: () => RecipesHexa;
    analyticsHexa: () => AnalyticsHexa;
    standardsHexa: () => StandardsHexa;
    deploymentsHexa: () => DeploymentsHexa;
  }
}
