/* eslint-disable @typescript-eslint/no-require-imports */
import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { createRequire } from 'module';
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
    hexaBundle: string;
    hexaExport: string;
    opts?: Partial<BaseHexaOpts>;
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
    this.logger.info(`Loading plugin from directory: ${pluginDir}`);
    const manifestPath = join(pluginDir, 'manifest.json');
    this.logger.info(`Looking for manifest at: ${manifestPath}`);

    if (!(await this.fileExists(manifestPath))) {
      this.logger.warn(`No manifest.json found in ${pluginDir}`);
      this.logger.info(`Listing directory contents of ${pluginDir}:`);
      try {
        const dirContents = await readdir(pluginDir);
        this.logger.info(`Directory contents: ${dirContents.join(', ')}`);
      } catch (err) {
        this.logger.error(`Failed to list directory: ${err}`);
      }
      return null;
    }

    this.logger.info(`Found manifest.json at: ${manifestPath}`);
    // Read and parse manifest
    const manifestContent = await readFile(manifestPath, 'utf-8');
    let manifest: PluginManifest;
    try {
      manifest = JSON.parse(manifestContent);
      this.logger.info(`Parsed manifest: ${JSON.stringify(manifest, null, 2)}`);
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
    if (manifest.backend) {
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
    } else {
      this.logger.info(`No backend configuration in manifest`);
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
    this.logger.info(`Loading Hexa class from bundle`);
    this.logger.info(`  pluginDir: ${pluginDir}`);
    this.logger.info(`  bundlePath (relative): ${bundlePath}`);
    this.logger.info(`  exportName: ${exportName}`);

    const fullBundlePath = resolve(pluginDir, bundlePath);
    this.logger.info(`  fullBundlePath (resolved): ${fullBundlePath}`);

    // Check if pluginDir exists
    const pluginDirExists = await this.directoryExists(pluginDir);
    this.logger.info(`  pluginDir exists: ${pluginDirExists}`);

    // List dist directory if it exists
    const distDir = join(pluginDir, 'dist');
    const distExists = await this.directoryExists(distDir);
    this.logger.info(`  dist directory exists: ${distExists} (${distDir})`);
    if (distExists) {
      try {
        const distContents = await readdir(distDir);
        this.logger.info(
          `  dist directory contents: ${distContents.join(', ')}`,
        );
      } catch (err) {
        this.logger.warn(`  Failed to list dist directory: ${err}`);
      }
    }

    // Check if bundle file exists
    const bundleExists = await this.fileExists(fullBundlePath);
    this.logger.info(`  Bundle file exists: ${bundleExists}`);

    if (!bundleExists) {
      // Try to find what files are in the plugin directory
      this.logger.error(`Bundle file not found: ${fullBundlePath}`);
      this.logger.info(`Attempting to list plugin directory to debug:`);
      try {
        const pluginContents = await readdir(pluginDir, { recursive: false });
        this.logger.info(
          `  Plugin directory contents: ${pluginContents.join(', ')}`,
        );
      } catch (err) {
        this.logger.error(`  Failed to list plugin directory: ${err}`);
      }
      throw new Error(`Bundle file not found: ${fullBundlePath}`);
    }

    this.logger.info(`Bundle file found, proceeding to load...`);

    // Load the bundle using require (CommonJS)
    // Dynamic require is necessary for plugin loading
    // This is intentional for runtime plugin loading
    this.logger.info(`Requiring bundle from: ${fullBundlePath}`);

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
    const logger = this.logger; // Capture logger for use in patched function

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
          logger.info(`Resolving ${request} from dist: ${distIndex}`);
          // Resolve the dist path as if it were a file
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
      this.logger.info(
        `Using createRequire to load bundle (bypassing webpack module system)...`,
      );
      bundle = nativeRequire(fullBundlePath);
      this.logger.info(`Bundle loaded successfully using native require`);
      this.logger.info(`Bundle exports: ${Object.keys(bundle).join(', ')}`);
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
    this.logger.info(`Looking for export: ${exportName}`);
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

    this.logger.info(`Found Hexa class: ${HexaClass.name || 'unnamed'}`);

    // Validate that it's a class that extends BaseHexa
    this.logger.info(`Validating Hexa class is a BaseHexa subclass...`);
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
      if (!manifest.backend.hexaBundle) {
        throw new Error(
          `Manifest backend missing "hexaBundle" field in ${pluginDir}`,
        );
      }
      if (!manifest.backend.hexaExport) {
        throw new Error(
          `Manifest backend missing "hexaExport" field in ${pluginDir}`,
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
