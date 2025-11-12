import { DynamicModule, Module, Type } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { HexaPluginLoader } from '@packmind/node-utils';

const logger = new PackmindLogger('PluginModulesModule', LogLevel.INFO);

// Global store for loaded plugin modules and their controllers (set before app bootstrap)
let pluginModules: Array<{
  module: Type<unknown>;
  controllers?: Type<unknown>[];
}> = [];

/**
 * Load plugin modules before app bootstrap.
 * This must be called in main.ts before NestFactory.create()
 */
export async function loadPluginModules(): Promise<DynamicModule> {
  const pluginLoader = new HexaPluginLoader(logger);
  const plugins = await pluginLoader.loadFromDirectory();

  // Filter plugins that have NestJS modules
  const pluginsWithModules = plugins.filter(
    (plugin) => plugin.nestjsModule !== undefined,
  );

  logger.info(
    `Found ${pluginsWithModules.length} plugin(s) with NestJS modules`,
  );

  pluginModules = [];

  for (const plugin of pluginsWithModules) {
    if (plugin.nestjsModule) {
      // Get controllers from the module (stored during loading)
      const moduleWithExtracted = plugin.nestjsModule as Type<unknown> & {
        __extractedControllers?: Type<unknown>[];
      };
      const extractedControllers =
        moduleWithExtracted.__extractedControllers || [];

      pluginModules.push({
        module: plugin.nestjsModule,
        controllers:
          extractedControllers.length > 0 ? extractedControllers : undefined,
      });
    }
  }

  // Return the DynamicModule that can be used in AppModule
  return PluginModulesModule.forRoot();
}

/**
 * NestJS Module for dynamically loading and registering plugin NestJS modules.
 *
 * This module:
 * - Imports all plugin NestJS modules that were loaded before app bootstrap
 * - Makes them available to the NestJS dependency injection system
 *
 * Usage:
 * ```typescript
 * // In main.ts, before NestFactory.create():
 * await loadPluginModules();
 *
 * // In app.module.ts:
 * @Module({
 *   imports: [
 *     PluginModulesModule.forRoot(),
 *     // ... other modules
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class PluginModulesModule {
  /**
   * Create a dynamic module that imports all plugin NestJS modules.
   */
  static forRoot(): DynamicModule {
    // Collect all controllers from plugins for manual registration
    const allControllers: Type<unknown>[] = [];
    const modulesToImport: Type<unknown>[] = [];

    for (const pluginModule of pluginModules) {
      const { module, controllers } = pluginModule;

      modulesToImport.push(module);

      // Use controllers from pluginModule, or fall back to module.__extractedControllers
      const moduleWithExtracted = module as Type<unknown> & {
        __extractedControllers?: Type<unknown>[];
      };
      const controllersToUse =
        controllers || moduleWithExtracted.__extractedControllers || [];

      if (controllersToUse && controllersToUse.length > 0) {
        allControllers.push(...controllersToUse);
      }
    }

    // Create a DynamicModule that imports the plugin modules
    // and explicitly registers controllers at the PluginModulesModule level
    return {
      module: PluginModulesModule,
      imports: modulesToImport,
      controllers: allControllers.length > 0 ? allControllers : undefined, // Register controllers at this module level
      exports: modulesToImport,
    };
  }
}
