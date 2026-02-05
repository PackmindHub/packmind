import {
  AllConfigsResult,
  CodingAgent,
  ConfigWithTarget,
  HierarchicalConfigResult,
  PackmindFileConfig,
  validateAgentsWithWarnings,
} from '@packmind/types';
import type { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { normalizePath } from '../../application/utils/pathUtils';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { logWarningConsole } from '../utils/consoleLogger';

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
    const configPath = this.getConfigPath(baseDirectory);
    await this.writeConfigToPath(configPath, config);
  }

  async configExists(baseDirectory: string): Promise<boolean> {
    const configPath = this.getConfigPath(baseDirectory);
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async readConfig(baseDirectory: string): Promise<PackmindFileConfig | null> {
    const configPath = this.getConfigPath(baseDirectory);

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);

      if (!rawConfig.packages || typeof rawConfig.packages !== 'object') {
        throw new Error(
          'Invalid packmind.json structure. Expected { packages: { ... } }',
        );
      }

      const { validAgents, invalidAgents } = validateAgentsWithWarnings(
        rawConfig.agents,
      );

      if (invalidAgents.length > 0) {
        logWarningConsole(
          `Invalid agent(s) in ${configPath}: ${invalidAgents.join(', ')}. Valid agents are: packmind, junie, claude, cursor, copilot, agents_md, gitlab_duo, continue`,
        );
      }

      const config: PackmindFileConfig = {
        packages: rawConfig.packages,
      };

      if (validAgents !== null) {
        config.agents = validAgents;
      }

      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      if (!this.warnedFiles.has(configPath)) {
        this.warnedFiles.add(configPath);
        logWarningConsole(`⚠ Skipping malformed config file: ${configPath}`);
      }
      return null;
    }
  }

  private getConfigPath(directory: string): string {
    return path.join(directory, this.CONFIG_FILENAME);
  }

  private async writeConfigToPath(
    configPath: string,
    config: PackmindFileConfig,
  ): Promise<void> {
    const configContent = JSON.stringify(config, null, 2) + '\n';
    await fs.writeFile(configPath, configContent, 'utf-8');
  }

  /**
   * Recursively finds all directories containing packmind.json in descendant folders.
   * Excludes common build/dependency directories (node_modules, .git, dist, etc.)
   */
  async findDescendantConfigs(directory: string): Promise<string[]> {
    const normalizedDir = normalizePath(path.resolve(directory));
    return this.searchDescendantsRecursively(normalizedDir);
  }

  private async searchDescendantsRecursively(
    currentDir: string,
  ): Promise<string[]> {
    const entries = await this.tryReadDirectory(currentDir);
    if (!entries) {
      return [];
    }

    const results: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || this.isExcludedDirectory(entry.name)) {
        continue;
      }

      const entryPath = normalizePath(path.join(currentDir, entry.name));
      const config = await this.readConfig(entryPath);

      if (config) {
        results.push(entryPath);
      }

      const nestedResults = await this.searchDescendantsRecursively(entryPath);
      results.push(...nestedResults);
    }

    return results;
  }

  private async tryReadDirectory(directory: string): Promise<Dirent[] | null> {
    try {
      return await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return null;
    }
  }

  private isExcludedDirectory(name: string): boolean {
    return this.EXCLUDED_DIRECTORIES.includes(name);
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
    const searchRoot = normalizedStop ?? normalizedStart;

    const configsMap = new Map<string, ConfigWithTarget>();

    await this.collectAncestorConfigs(
      normalizedStart,
      normalizedStop,
      basePath,
      configsMap,
    );
    await this.collectDescendantConfigs(searchRoot, basePath, configsMap);
    await this.collectRootConfigIfMissing(searchRoot, basePath, configsMap);

    const configs = Array.from(configsMap.values());

    return {
      configs,
      hasConfigs: configs.length > 0,
      basePath,
    };
  }

  private async collectAncestorConfigs(
    startDir: string,
    stopDir: string | null,
    basePath: string,
    configsMap: Map<string, ConfigWithTarget>,
  ): Promise<void> {
    let currentDir = startDir;

    while (true) {
      await this.addConfigToMap(currentDir, basePath, configsMap);

      if (stopDir !== null && currentDir === stopDir) {
        break;
      }

      const parentDir = normalizePath(path.dirname(currentDir));
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  }

  private async collectDescendantConfigs(
    searchRoot: string,
    basePath: string,
    configsMap: Map<string, ConfigWithTarget>,
  ): Promise<void> {
    const descendantDirs = await this.findDescendantConfigs(searchRoot);

    for (const descendantDir of descendantDirs) {
      const normalizedDescendantDir = normalizePath(descendantDir);
      if (configsMap.has(normalizedDescendantDir)) {
        continue;
      }
      await this.addConfigToMap(normalizedDescendantDir, basePath, configsMap);
    }
  }

  private async collectRootConfigIfMissing(
    searchRoot: string,
    basePath: string,
    configsMap: Map<string, ConfigWithTarget>,
  ): Promise<void> {
    if (!configsMap.has(searchRoot)) {
      await this.addConfigToMap(searchRoot, basePath, configsMap);
    }
  }

  private async addConfigToMap(
    directory: string,
    basePath: string,
    configsMap: Map<string, ConfigWithTarget>,
  ): Promise<void> {
    const config = await this.readConfig(directory);
    if (!config) {
      return;
    }

    const targetPath = this.computeRelativeTargetPath(directory, basePath);
    configsMap.set(directory, {
      targetPath,
      absoluteTargetPath: directory,
      packages: config.packages,
      agents: config.agents,
    });
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

  /**
   * Adds new packages to an existing packmind.json while preserving property order.
   * If the file doesn't exist, creates a new one with default order (packages first).
   *
   * Uses JavaScript's built-in property order preservation: JSON.parse() preserves
   * insertion order for string keys, and mutating the existing object maintains
   * that order when JSON.stringify() outputs it.
   */
  async addPackagesToConfig(
    baseDirectory: string,
    newPackageSlugs: string[],
  ): Promise<void> {
    const configPath = this.getConfigPath(baseDirectory);

    const rawContent = await this.tryReadFile(configPath);
    if (!rawContent) {
      const newConfig = this.createConfigWithPackages(newPackageSlugs);
      await this.writeConfigToPath(configPath, newConfig);
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const newConfig = this.createConfigWithPackages(newPackageSlugs);
      await this.writeConfigToPath(configPath, newConfig);
      return;
    }

    // Ensure packages exists
    if (!parsed.packages || typeof parsed.packages !== 'object') {
      parsed.packages = {};
    }

    // Add new packages directly - mutating preserves key order
    const packages = parsed.packages as Record<string, string>;
    for (const slug of newPackageSlugs) {
      if (!(slug in packages)) {
        packages[slug] = '*';
      }
    }

    // Write back - JSON.stringify() preserves original key order
    await this.writeConfigToPath(configPath, parsed as PackmindFileConfig);
  }

  /**
   * Updates a specific field in packmind.json while preserving property order.
   * If the file doesn't exist, creates a new one with default packages and the field.
   */
  async updateConfig<K extends keyof PackmindFileConfig>(
    baseDirectory: string,
    field: K,
    value: PackmindFileConfig[K],
  ): Promise<void> {
    const configPath = this.getConfigPath(baseDirectory);

    const rawContent = await this.tryReadFile(configPath);
    if (!rawContent) {
      const newConfig: PackmindFileConfig = { packages: {}, [field]: value };
      await this.writeConfigToPath(configPath, newConfig);
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const newConfig: PackmindFileConfig = { packages: {}, [field]: value };
      await this.writeConfigToPath(configPath, newConfig);
      return;
    }

    // Ensure packages exists
    if (!parsed.packages || typeof parsed.packages !== 'object') {
      parsed.packages = {};
    }

    // Update the field - mutating preserves key order
    parsed[field] = value;

    // Write back - JSON.stringify() preserves original key order
    await this.writeConfigToPath(configPath, parsed as PackmindFileConfig);
  }

  /**
   * Updates the agents configuration in packmind.json.
   * Convenience wrapper around updateConfig for the agents field.
   */
  async updateAgentsConfig(
    baseDirectory: string,
    agents: CodingAgent[],
  ): Promise<void> {
    return this.updateConfig(baseDirectory, 'agents', agents);
  }

  private async tryReadFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private createConfigWithPackages(slugs: string[]): PackmindFileConfig {
    const packages: Record<string, string> = {};
    for (const slug of slugs) {
      packages[slug] = '*';
    }
    return { packages };
  }
}
