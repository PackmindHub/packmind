import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AccountsHexa } from '@packmind/accounts';
import { GitHexa } from '@packmind/git';
import { RecipesHexa } from '@packmind/recipes';
import { StandardsHexa } from '@packmind/standards';
import { DeploymentsHexa } from '@packmind/deployments';
import { HexaRegistry, PackmindLogger, LogLevel } from '@packmind/shared';
import { AnalyticsHexa } from '@packmind/analytics';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { JobsHexa } from '@packmind/jobs';
import { SpacesHexa } from '@packmind/spaces';
import { LinterHexa } from '@packmind/linter';

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
    // AccountsHexa has no dependencies, JobsHexa has no dependencies, GitHexa may depend on Accounts, RecipesHexa depends on Git, StandardsHexa depends on Git and Jobs
    registry.register(AccountsHexa);
    logger.debug('AccountsHexa registered');

    registry.register(JobsHexa);
    logger.debug('JobsHexa registered');

    registry.register(GitHexa);
    logger.debug('GitHexa registered');
    registry.register(SpacesHexa);
    logger.debug('SpacesHexa registered');
    registry.register(LinterHexa);
    logger.debug('LinterHexa registered');
    registry.register(RecipesHexa);
    logger.debug('RecipesHexa registered');
    registry.register(StandardsHexa);
    logger.debug('StandardsHexa registered');

    //Deployments hexa need coding agent hexa for now
    registry.register(CodingAgentHexa);
    logger.debug('CodingAgentHexa registered');

    registry.register(DeploymentsHexa);
    logger.debug('DeploymentsHexa registered');
    registry.register(AnalyticsHexa);
    logger.debug('AnalyticsHexa registered');

    logger.debug('Domain hexas registered successfully');

    // Hook into Fastify ready event to initialize after database is ready
    fastify.addHook('onReady', async () => {
      logger.info('Initializing HexaRegistry with DataSource');

      if (!fastify.orm) {
        throw new Error(
          'Database connection (fastify.orm) not available. Ensure the database plugin is registered before HexaRegistry.',
        );
      }

      // Initialize the registry with the DataSource (synchronous phase)
      registry.init(fastify.orm);
      logger.debug('Synchronous initialization complete');

      // Initialize async dependencies (e.g., job queues)
      await registry.initAsync();
      logger.debug('Async initialization complete');

      // Set up bidirectional dependency between LinterHexa and StandardsHexa
      try {
        const linterHexa = registry.get(LinterHexa);
        const standardsHexa = registry.get(StandardsHexa);

        // Inject LinterAdapter into StandardsHexa
        const linterAdapter = linterHexa.getLinterAdapter();
        standardsHexa.setLinterAdapter(linterAdapter);
        logger.info('LinterAdapter injected into StandardsHexa');

        // Inject StandardsAdapter into LinterHexa
        const standardsAdapter = standardsHexa.getStandardsAdapter();
        linterHexa.setStandardAdapter(standardsAdapter);
        logger.info('StandardsAdapter injected into LinterHexa');
      } catch (error) {
        logger.warn(
          'Failed to inject adapters between LinterHexa and StandardsHexa',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }

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

    fastify.decorate('jobsHexa', () => {
      logger.debug('jobsHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(JobsHexa);
    });
    logger.debug('jobsHexa decorator added');

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

    fastify.decorate('spacesHexa', () => {
      logger.debug('spacesHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(SpacesHexa);
    });
    logger.debug('spacesHexa decorator added');

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

    fastify.decorate('deploymentsHexa', () => {
      logger.debug('deploymentsHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(DeploymentsHexa);
    });
    logger.debug('deploymentsHexa decorator added');

    fastify.decorate('analyticsHexa', () => {
      logger.debug('analyticsHexa() called');
      if (!registry.initialized) {
        throw new Error(
          'HexaRegistry not initialized yet. Ensure database connection is ready.',
        );
      }
      return registry.get(AnalyticsHexa);
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
    jobsHexa: () => JobsHexa;
    gitHexa: () => GitHexa;
    spacesHexa: () => SpacesHexa;
    recipesHexa: () => RecipesHexa;
    analyticsHexa: () => AnalyticsHexa;
    standardsHexa: () => StandardsHexa;
    deploymentsHexa: () => DeploymentsHexa;
  }
}
