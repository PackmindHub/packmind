/* eslint-disable @typescript-eslint/no-require-imports */
import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { createRequire } from 'module';
import { Type } from '@nestjs/common';
import { BaseHexa, BaseHexaOpts } from './BaseHexa';
import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';

const origin = 'HexaPluginLoader';

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  name: string;
  version: string;
  id: string;
  description?: string;
  backend?: {
    hexaBundle?: string;
    hexaExport?: string;
    opts?: Partial<BaseHexaOpts>;
    nestjsModule?: string; // Export name of NestJS module class in the bundle
  };
  frontend?: {
    bundle: string;
    routes?: Array<{
      path: string;
      component: string;
      loader?: string;
    }>;
  };
  dependencies?: {
    packmind?: string;
  };
}

/**
 * Loaded plugin information
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  pluginDir: string;
  hexaClass?: new (
    dataSource: DataSource,
    opts?: Partial<BaseHexaOpts>,
  ) => BaseHexa;
  nestjsModule?: Type<unknown>; // NestJS module class
  nestjsControllers?: Type<unknown>[]; // Controllers extracted from the module (for manual registration)
}

/**
 * Loader for Packmind plugins.
 *
 * Scans a plugin directory for manifest.json files, loads plugin bundles,
 * and extracts Hexa classes for registration with HexaRegistry.
 */
export class HexaPluginLoader {
  private readonly logger: PackmindLogger;

  constructor(logger?: PackmindLogger) {
    this.logger = logger ?? new PackmindLogger(origin);
  }

  /**
   * Load all plugins from a directory.
   *
   * @param pluginDir - Path to the plugin directory (defaults to plugins/ or dist/plugins/)
   * @returns Array of loaded plugins
   */
  async loadFromDirectory(pluginDir?: string): Promise<LoadedPlugin[]> {
    const resolvedDir = this.resolvePluginDirectory(pluginDir);
    this.logger.info(`Loading plugins from: ${resolvedDir}`);
    this.logger.info(`Current working directory: ${process.cwd()}`);
    this.logger.info(`NODE_ENV: ${process.env['NODE_ENV'] || 'not set'}`);

    if (!(await this.directoryExists(resolvedDir))) {
      this.logger.warn(`Plugin directory does not exist: ${resolvedDir}`);
      return [];
    }

    this.logger.info(`Plugin directory exists: ${resolvedDir}`);
    const plugins: LoadedPlugin[] = [];
    const entries = await readdir(resolvedDir, { withFileTypes: true });

    this.logger.info(`Found ${entries.length} entries in plugin directory`);
    for (const entry of entries) {
      this.logger.info(
        `Entry: ${entry.name} (isDirectory: ${entry.isDirectory()}, isSymbolicLink: ${entry.isSymbolicLink()})`,
      );

      if (!entry.isDirectory()) {
        this.logger.debug(`Skipping non-directory entry: ${entry.name}`);
        continue;
      }

      const pluginPath = join(resolvedDir, entry.name);
      this.logger.info(`Attempting to load plugin from: ${pluginPath}`);
      try {
        const plugin = await this.loadPlugin(pluginPath);
        if (plugin) {
          plugins.push(plugin);
          this.logger.info(
            `Successfully loaded plugin: ${plugin.manifest.name} (${plugin.manifest.id})`,
          );
        } else {
          this.logger.warn(`loadPlugin returned null for: ${pluginPath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to load plugin from ${pluginPath}`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue loading other plugins even if one fails
      }
    }

    this.logger.info(`Loaded ${plugins.length} plugin(s) total`);
    return plugins;
  }

  /**
   * Load a single plugin from a directory.
   */
  private async loadPlugin(pluginDir: string): Promise<LoadedPlugin | null> {
    const manifestPath = join(pluginDir, 'manifest.json');

    if (!(await this.fileExists(manifestPath))) {
      this.logger.warn(`No manifest.json found in ${pluginDir}`);
      return null;
    }

    // Read and parse manifest
    const manifestContent = await readFile(manifestPath, 'utf-8');
    let manifest: PluginManifest;
    try {
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      this.logger.error(`Failed to parse manifest.json: ${error}`);
      throw new Error(`Invalid manifest.json in ${pluginDir}: ${error}`);
    }

    // Validate manifest
    this.logger.info(
      `Validating manifest for plugin: ${manifest.name || manifest.id}`,
    );
    this.validateManifest(manifest, pluginDir);
    this.logger.info(`Manifest validation passed`);

    const loadedPlugin: LoadedPlugin = {
      manifest,
      pluginDir,
    };

    // Load backend Hexa if present
    if (manifest.backend?.hexaBundle && manifest.backend?.hexaExport) {
      this.logger.info(
        `Loading backend Hexa: bundle=${manifest.backend.hexaBundle}, export=${manifest.backend.hexaExport}`,
      );
      loadedPlugin.hexaClass = await this.loadHexaClass(
        pluginDir,
        manifest.backend.hexaBundle,
        manifest.backend.hexaExport,
      );
      this.logger.info(
        `Successfully loaded Hexa class: ${manifest.backend.hexaExport}`,
      );
    }

    // Load NestJS module if present
    if (manifest.backend?.nestjsModule) {
      this.logger.info(
        `Loading NestJS module: bundle=${manifest.backend.hexaBundle || 'hexaBundle'}, export=${manifest.backend.nestjsModule}`,
      );
      // Use the same bundle as hexaBundle, or require hexaBundle to be specified
      const bundlePath = manifest.backend.hexaBundle;
      if (!bundlePath) {
        throw new Error(
          `nestjsModule specified but hexaBundle is required in ${pluginDir}`,
        );
      }
      loadedPlugin.nestjsModule = await this.loadNestJSModule(
        pluginDir,
        bundlePath,
        manifest.backend.nestjsModule,
      );
      this.logger.info(
        `Successfully loaded NestJS module: ${manifest.backend.nestjsModule}`,
      );
    }

    return loadedPlugin;
  }

  /**
   * Load Hexa class from a bundle file.
   */
  private async loadHexaClass(
    pluginDir: string,
    bundlePath: string,
    exportName: string,
  ): Promise<
    new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
  > {
    const fullBundlePath = resolve(pluginDir, bundlePath);

    if (!(await this.fileExists(fullBundlePath))) {
      throw new Error(`Bundle file not found: ${fullBundlePath}`);
    }

    // Load the bundle using require (CommonJS)
    // Dynamic require is necessary for plugin loading
    // This is intentional for runtime plugin loading

    // Use createRequire to create a native Node.js require function
    // This bypasses webpack's module system which doesn't support dynamic requires
    // of external files. createRequire creates a require function that uses Node's
    // native module resolution, which works with absolute paths and .cjs files.
    //
    // For workspace packages in a monorepo, we need to patch module resolution
    // to resolve @packmind/* packages from dist/packages (built) instead of
    // node_modules (which may point to source via symlinks).
    const mainAppContext = resolve(process.cwd(), 'package.json');
    const nativeRequire = createRequire(mainAppContext);

    // Patch Module._resolveFilename to resolve @packmind packages from dist
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    const fs = require('fs');

    Module._resolveFilename = function (
      request: string,
      parent: NodeModule,
      isMain: boolean,
      options?: { paths?: string[] },
    ) {
      // For @packmind packages, try to resolve from dist/packages first
      if (request.startsWith('@packmind/')) {
        const packageName = request.replace('@packmind/', '');
        const distPath = resolve(process.cwd(), 'dist/packages', packageName);
        const distIndex = join(distPath, 'src/index.js');

        if (fs.existsSync(distIndex)) {
          return originalResolveFilename.call(
            Module,
            distIndex,
            parent,
            isMain,
            options,
          );
        }
      }

      // Fall back to normal resolution
      return originalResolveFilename.call(
        Module,
        request,
        parent,
        isMain,
        options,
      );
    };

    let bundle;
    try {
      bundle = nativeRequire(fullBundlePath);
    } catch (requireError) {
      this.logger.error(`Failed to require bundle: ${requireError}`);

      // Final check: verify file actually exists and is readable
      try {
        const stats = fs.statSync(fullBundlePath);
        this.logger.error(
          `File stats: ${JSON.stringify({
            exists: true,
            size: stats.size,
            isFile: stats.isFile(),
            mode: stats.mode.toString(8),
          })}`,
        );
      } catch (statError) {
        this.logger.error(`File stat failed: ${statError}`);
      }

      throw new Error(
        `Failed to load bundle from ${fullBundlePath}: ${requireError}`,
      );
    } finally {
      // Restore original resolve function
      Module._resolveFilename = originalResolveFilename;
    }

    // Extract the Hexa class from the bundle
    const HexaClass =
      bundle[exportName] || bundle.default?.[exportName] || bundle.default;

    if (!HexaClass) {
      this.logger.error(
        `Hexa class "${exportName}" not found in bundle. Available exports: ${Object.keys(bundle).join(', ')}`,
      );
      throw new Error(
        `Hexa class "${exportName}" not found in bundle. Available exports: ${Object.keys(bundle).join(', ')}`,
      );
    }

    // Validate that it's a class that extends BaseHexa
    if (typeof HexaClass !== 'function') {
      this.logger.error(`Export "${exportName}" is not a class`);
      throw new Error(`Export "${exportName}" is not a class`);
    }

    // Check if it extends BaseHexa (basic check)
    // We can't do instanceof check here, but we can check the prototype chain
    const prototype = HexaClass.prototype;
    if (!prototype || typeof prototype.initialize !== 'function') {
      this.logger.error(
        `Class "${exportName}" does not appear to extend BaseHexa (missing initialize method)`,
      );
      throw new Error(
        `Class "${exportName}" does not appear to extend BaseHexa (missing initialize method)`,
      );
    }

    this.logger.info(`Hexa class validation passed`);

    return HexaClass as new (
      dataSource: DataSource,
      opts?: Partial<BaseHexaOpts>,
    ) => BaseHexa;
  }

  /**
   * Load NestJS module class from a bundle file.
   */
  private async loadNestJSModule(
    pluginDir: string,
    bundlePath: string,
    exportName: string,
  ): Promise<Type<unknown>> {
    const fullBundlePath = resolve(pluginDir, bundlePath);

    if (!(await this.fileExists(fullBundlePath))) {
      throw new Error(`Bundle file not found: ${fullBundlePath}`);
    }

    // Ensure reflect-metadata is available before loading the bundle
    // This is needed for NestJS decorators to work properly
    try {
      require('reflect-metadata');
    } catch {
      // reflect-metadata might already be loaded, that's fine
    }

    // Use the same require mechanism as Hexa loading
    const mainAppContext = resolve(process.cwd(), 'package.json');
    const nativeRequire = createRequire(mainAppContext);

    // Patch Module._resolveFilename to resolve @packmind packages from dist
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    const fs = require('fs');

    Module._resolveFilename = function (
      request: string,
      parent: NodeModule,
      isMain: boolean,
      options?: { paths?: string[] },
    ) {
      if (request.startsWith('@packmind/')) {
        const packageName = request.replace('@packmind/', '');
        const distPath = resolve(process.cwd(), 'dist/packages', packageName);
        const distIndex = join(distPath, 'src/index.js');

        if (fs.existsSync(distIndex)) {
          return originalResolveFilename.call(
            Module,
            distIndex,
            parent,
            isMain,
            options,
          );
        }
      }

      return originalResolveFilename.call(
        Module,
        request,
        parent,
        isMain,
        options,
      );
    };

    let bundle;
    try {
      // Ensure reflect-metadata is available in the global scope before loading
      // This is critical for decorator metadata to be stored correctly
      if (typeof globalThis.Reflect === 'undefined') {
        require('reflect-metadata');
      }
      bundle = nativeRequire(fullBundlePath);
    } catch (requireError) {
      this.logger.error(`Failed to require bundle: ${requireError}`);
      throw new Error(
        `Failed to load bundle from ${fullBundlePath}: ${requireError}`,
      );
    } finally {
      Module._resolveFilename = originalResolveFilename;
    }

    // Extract the NestJS module class from the bundle
    let NestJSModule =
      bundle[exportName] || bundle.default?.[exportName] || bundle.default;

    // Handle getter functions
    if (typeof NestJSModule === 'function' && NestJSModule.length === 0) {
      try {
        NestJSModule = NestJSModule();
      } catch {
        // Not a getter, use as-is
      }
    }

    if (!NestJSModule) {
      this.logger.error(
        `NestJS module "${exportName}" not found in bundle. Available exports: ${Object.keys(bundle).join(', ')}`,
      );
      throw new Error(
        `NestJS module "${exportName}" not found in bundle. Available exports: ${Object.keys(bundle).join(', ')}`,
      );
    }

    // Basic validation: check if it looks like a NestJS module (has decorators/metadata)
    if (typeof NestJSModule !== 'function') {
      this.logger.error(`Export "${exportName}" is not a class`);
      throw new Error(`Export "${exportName}" is not a class`);
    }

    // Extract controllers from bundle for manual registration
    const extractedControllers: Type<unknown>[] = [];
    for (const [key, value] of Object.entries(bundle)) {
      if (key === exportName) continue;

      let controllerClass = value;
      if (typeof value === 'function' && value.length === 0) {
        try {
          controllerClass = value();
        } catch {
          // Not a getter
        }
      }

      if (typeof controllerClass === 'function' && key.includes('Controller')) {
        const Reflect = globalThis.Reflect || require('reflect-metadata');
        const path = Reflect.getMetadata('path', controllerClass);
        if (path !== undefined || key.includes('Controller')) {
          extractedControllers.push(controllerClass as Type<unknown>);
        }
      }
    }

    // Try to manually reconstruct metadata if it's not accessible
    // This is needed because when esbuild bundles the code, decorator metadata
    // might not be accessible when the module is loaded dynamically
    try {
      const Reflect = globalThis.Reflect || require('reflect-metadata');
      const existingMetadata = Reflect.getMetadata(
        'module:metadata',
        NestJSModule,
      );

      if (!existingMetadata) {
        this.logger.info(
          `Module metadata not accessible, attempting to reconstruct...`,
        );

        // Try to find controllers in the bundle exports
        // Look for classes that might be controllers (they should be exported)
        // Note: Bundle exports might be getter functions, so we need to call them
        const possibleControllers: Type<unknown>[] = [];
        for (const [key, value] of Object.entries(bundle)) {
          // Skip the module itself
          if (key === exportName) {
            continue;
          }

          // Handle getter functions (e.g., SamplePluginController: () => SamplePluginController)
          let actualValue = value;
          if (typeof value === 'function') {
            // Try calling it as a getter function first
            try {
              const called = value();
              if (called && typeof called === 'function') {
                actualValue = called;
              }
            } catch {
              // Not a getter, use as-is (it's the class itself)
              actualValue = value;
            }
          }

          // Skip non-class exports
          if (
            typeof actualValue !== 'function' ||
            actualValue === null ||
            actualValue === undefined
          ) {
            continue;
          }

          // Check if it has controller metadata or if the key suggests it's a controller
          const controllerPath = Reflect.getMetadata('path', actualValue);
          const isController =
            controllerPath !== undefined || key.includes('Controller');

          if (isController) {
            possibleControllers.push(actualValue as Type<unknown>);
            this.logger.info(
              `Found possible controller: ${key} (${actualValue.name || 'unnamed'}), path: ${controllerPath || 'unknown'}`,
            );
          }
        }

        // If we found controllers, manually set the metadata
        if (possibleControllers.length > 0) {
          // Filter out any null/undefined controllers
          const validControllers = possibleControllers.filter(
            (c) => c !== null && c !== undefined && typeof c === 'function',
          );

          if (validControllers.length > 0) {
            // Store controllers directly on the module as a property for debugging
            // This helps ensure the reference persists
            (
              NestJSModule as Type<unknown> & {
                __pluginControllers?: Type<unknown>[];
              }
            ).__pluginControllers = validControllers;

            const moduleMetadata = {
              controllers: validControllers,
              providers: [],
              exports: [],
              imports: [],
            };

            // Use defineMetadata to set the metadata
            // This is the key that NestJS uses to discover controllers
            Reflect.defineMetadata(
              'module:metadata',
              moduleMetadata,
              NestJSModule,
            );

            // Also try setting it with the NestJS-specific key
            // NestJS might use a different metadata key internally
            Reflect.defineMetadata(
              'controllers',
              validControllers,
              NestJSModule,
            );

            this.logger.info(
              `Manually set module metadata with ${validControllers.length} controller(s)`,
            );
            // Log controller details for debugging
            for (const controller of validControllers) {
              const path = Reflect.getMetadata('path', controller);
              this.logger.info(
                `  Controller: ${controller.name}, path: ${path || 'root'}, type: ${typeof controller}`,
              );
              // Verify controller has its own metadata
              const controllerMethods = Reflect.getMetadata(
                'routes',
                controller,
              );
              this.logger.info(
                `    Controller methods: ${controllerMethods ? controllerMethods.length : 0}`,
              );
            }

            // Verify metadata was set correctly
            const verifyMetadata = Reflect.getMetadata(
              'module:metadata',
              NestJSModule,
            );
            if (verifyMetadata?.controllers) {
              const allValid = verifyMetadata.controllers.every(
                (c: unknown) =>
                  c !== null && c !== undefined && typeof c === 'function',
              );
              if (!allValid) {
                this.logger.error(
                  `Metadata verification failed: some controllers are invalid`,
                );
              } else {
                this.logger.info(
                  `Metadata verification passed: all controllers are valid`,
                );
              }
            }
          } else {
            this.logger.warn(
              `No valid controllers found after filtering (${possibleControllers.length} total, all invalid)`,
            );
          }
        }
      } else {
        this.logger.info(`Module metadata is accessible`);
      }
    } catch (err) {
      this.logger.warn(`Failed to reconstruct module metadata: ${err}`);
      // Continue anyway - NestJS might still be able to process the module
    }

    // Store extracted controllers on the module for later use
    if (extractedControllers.length > 0) {
      (
        NestJSModule as Type<unknown> & {
          __extractedControllers?: Type<unknown>[];
        }
      ).__extractedControllers = extractedControllers;
    }

    return NestJSModule as Type<unknown>;
  }

  /**
   * Validate plugin manifest structure.
   */
  private validateManifest(manifest: PluginManifest, pluginDir: string): void {
    if (!manifest.name) {
      throw new Error(`Manifest missing "name" field in ${pluginDir}`);
    }
    if (!manifest.id) {
      throw new Error(`Manifest missing "id" field in ${pluginDir}`);
    }
    if (!manifest.version) {
      throw new Error(`Manifest missing "version" field in ${pluginDir}`);
    }

    if (manifest.backend) {
      // If hexaExport is specified, hexaBundle is required
      if (manifest.backend.hexaExport && !manifest.backend.hexaBundle) {
        throw new Error(
          `Manifest backend has "hexaExport" but missing "hexaBundle" field in ${pluginDir}`,
        );
      }
      // If nestjsModule is specified, hexaBundle is required (they share the same bundle)
      if (manifest.backend.nestjsModule && !manifest.backend.hexaBundle) {
        throw new Error(
          `Manifest backend has "nestjsModule" but missing "hexaBundle" field in ${pluginDir}`,
        );
      }
    }
  }

  /**
   * Resolve plugin directory path.
   * Checks PACKMIND_PLUGINS_DIR env var, then defaults to plugins/ or dist/plugins/.
   */
  private resolvePluginDirectory(pluginDir?: string): string {
    if (pluginDir) {
      return resolve(pluginDir);
    }

    // Check environment variable
    const envDir = process.env['PACKMIND_PLUGINS_DIR'];
    if (envDir) {
      return resolve(envDir);
    }

    // Default: plugins/ in development, dist/plugins/ in production
    const isDevelopment = process.env['NODE_ENV'] !== 'production';
    const defaultDir = isDevelopment ? 'plugins' : 'dist/plugins';
    return resolve(process.cwd(), defaultDir);
  }

  /**
   * Check if a directory exists.
   */
  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists.
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}
