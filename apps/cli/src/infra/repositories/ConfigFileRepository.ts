import {
  AllConfigsResult,
  ConfigWithTarget,
  HierarchicalConfigResult,
  PackmindFileConfig,
} from '@packmind/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logWarningConsole } from '../utils/consoleLogger';
import { normalizePath } from '../../application/utils/pathUtils';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';

export class ConfigFileRepository implements IConfigFileRepository {
  private readonly CONFIG_FILENAME = 'packmind.json';
  private readonly warnedFiles = new Set<string>();
  private readonly EXCLUDED_DIRECTORIES = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.nx',
  ];

  async writeConfig(
    baseDirectory: string,
    config: PackmindFileConfig,
  ): Promise<void> {
    const configPath = path.join(baseDirectory, this.CONFIG_FILENAME);
    const configContent = JSON.stringify(config, null, 2) + '\n';
    await fs.writeFile(configPath, configContent, 'utf-8');
  }

  async configExists(baseDirectory: string): Promise<boolean> {
    const configPath = path.join(baseDirectory, this.CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async readConfig(baseDirectory: string): Promise<PackmindFileConfig | null> {
    const configPath = path.join(baseDirectory, this.CONFIG_FILENAME);

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent) as PackmindFileConfig;

      // Validate structure
      if (!config.packages || typeof config.packages !== 'object') {
        throw new Error(
          'Invalid packmind.json structure. Expected { packages: { ... } }',
        );
      }

      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - this is OK
        return null;
      }

      // Malformed JSON or invalid structure - warn once and skip
      if (!this.warnedFiles.has(configPath)) {
        this.warnedFiles.add(configPath);
        logWarningConsole(`⚠ Skipping malformed config file: ${configPath}`);
      }
      return null;
    }
  }

  /**
   * Recursively finds all directories containing packmind.json in descendant folders.
   * Excludes common build/dependency directories (node_modules, .git, dist, etc.)
   *
   * @param directory - The root directory to search from
   * @returns Array of directory paths that contain a packmind.json file
   */
  async findDescendantConfigs(directory: string): Promise<string[]> {
    const normalizedDir = normalizePath(path.resolve(directory));
    const results: string[] = [];

    const searchRecursively = async (currentDir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        if (this.EXCLUDED_DIRECTORIES.includes(entry.name)) {
          continue;
        }

        const entryPath = normalizePath(path.join(currentDir, entry.name));
        const config = await this.readConfig(entryPath);

        if (config) {
          results.push(entryPath);
        }

        await searchRecursively(entryPath);
      }
    };

    await searchRecursively(normalizedDir);

    return results;
  }

  /**
   * Reads all packmind.json files from startDirectory up to stopDirectory (inclusive)
   * and merges their package configurations.
   *
   * @param startDirectory - Directory to start searching from (typically the lint target)
   * @param stopDirectory - Directory to stop searching at (typically git repo root), or null to walk to filesystem root
   * @returns Merged configuration from all found packmind.json files
   */
  async readHierarchicalConfig(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<HierarchicalConfigResult> {
    const configs: PackmindFileConfig[] = [];
    const configPaths: string[] = [];

    const normalizedStart = normalizePath(path.resolve(startDirectory));
    const normalizedStop = stopDirectory
      ? normalizePath(path.resolve(stopDirectory))
      : null;

    let currentDir = normalizedStart;

    while (true) {
      const config = await this.readConfig(currentDir);
      if (config) {
        configs.push(config);
        configPaths.push(
          normalizePath(path.join(currentDir, this.CONFIG_FILENAME)),
        );
      }

      if (normalizedStop !== null && currentDir === normalizedStop) {
        break;
      }

      const parentDir = normalizePath(path.dirname(currentDir));

      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }

    const mergedPackages: { [slug: string]: string } = {};
    for (const config of configs) {
      for (const [slug, version] of Object.entries(config.packages)) {
        if (!(slug in mergedPackages)) {
          mergedPackages[slug] = version;
        }
      }
    }

    return {
      packages: mergedPackages,
      configPaths,
      hasConfigs: configs.length > 0,
    };
  }

  /**
   * Finds all packmind.json files in the tree (both ancestors and descendants)
   * and returns each config with its target path.
   *
   * @param startDirectory - Directory to start searching from (typically the lint target)
   * @param stopDirectory - Directory to stop ancestor search at (typically git repo root), also used as base for descendants search
   * @returns All configs found with their target paths
   */
  async findAllConfigsInTree(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<AllConfigsResult> {
    const normalizedStart = normalizePath(path.resolve(startDirectory));
    const normalizedStop = stopDirectory
      ? normalizePath(path.resolve(stopDirectory))
      : null;
    const basePath = normalizedStop ?? normalizedStart;

    const configsMap = new Map<string, ConfigWithTarget>();

    // 1. Walk up from start to stop (ancestors)
    let currentDir = normalizedStart;
    while (true) {
      const config = await this.readConfig(currentDir);
      if (config) {
        const targetPath = this.computeRelativeTargetPath(currentDir, basePath);
        configsMap.set(currentDir, {
          targetPath,
          absoluteTargetPath: currentDir,
          packages: config.packages,
        });
      }

      if (normalizedStop !== null && currentDir === normalizedStop) {
        break;
      }

      const parentDir = normalizePath(path.dirname(currentDir));
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    // 2. Walk down from stop directory (or start if no stop) to find descendants
    const searchRoot = normalizedStop ?? normalizedStart;
    const descendantDirs = await this.findDescendantConfigs(searchRoot);

    for (const descendantDir of descendantDirs) {
      const normalizedDescendantDir = normalizePath(descendantDir);
      // Skip if already found in ancestor walk
      if (configsMap.has(normalizedDescendantDir)) {
        continue;
      }

      const config = await this.readConfig(normalizedDescendantDir);
      if (config) {
        const targetPath = this.computeRelativeTargetPath(
          normalizedDescendantDir,
          basePath,
        );
        configsMap.set(normalizedDescendantDir, {
          targetPath,
          absoluteTargetPath: normalizedDescendantDir,
          packages: config.packages,
        });
      }
    }

    // 3. Also check the search root itself if not already checked
    if (!configsMap.has(searchRoot)) {
      const rootConfig = await this.readConfig(searchRoot);
      if (rootConfig) {
        configsMap.set(searchRoot, {
          targetPath: '/',
          absoluteTargetPath: searchRoot,
          packages: rootConfig.packages,
        });
      }
    }

    const configs = Array.from(configsMap.values());

    return {
      configs,
      hasConfigs: configs.length > 0,
      basePath,
    };
  }

  private computeRelativeTargetPath(
    absolutePath: string,
    basePath: string,
  ): string {
    const normalizedAbsolute = normalizePath(absolutePath);
    const normalizedBase = normalizePath(basePath);

    if (normalizedAbsolute === normalizedBase) {
      return '/';
    }

    const relativePath = normalizedAbsolute.substring(normalizedBase.length);
    return relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  }
}
