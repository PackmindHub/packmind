import { HierarchicalConfigResult, PackmindFileConfig } from '@packmind/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ConfigFileRepository {
  private readonly CONFIG_FILENAME = 'packmind.json';

  async writeConfig(
    baseDirectory: string,
    config: PackmindFileConfig,
  ): Promise<void> {
    const configPath = path.join(baseDirectory, this.CONFIG_FILENAME);
    const configContent = JSON.stringify(config, null, 2) + '\n';
    await fs.writeFile(configPath, configContent, 'utf-8');
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

      // Malformed JSON or invalid structure - throw error to stop execution
      throw new Error(
        `Failed to read packmind.json: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Reads all packmind.json files from startDirectory up to stopDirectory (inclusive)
   * and merges their package configurations.
   *
   * @param startDirectory - Directory to start searching from (typically the lint target)
   * @param stopDirectory - Directory to stop searching at (typically git repo root)
   * @returns Merged configuration from all found packmind.json files
   */
  async readHierarchicalConfig(
    startDirectory: string,
    stopDirectory: string,
  ): Promise<HierarchicalConfigResult> {
    const configs: PackmindFileConfig[] = [];
    const configPaths: string[] = [];

    const normalizedStart = path.resolve(startDirectory);
    const normalizedStop = path.resolve(stopDirectory);

    let currentDir = normalizedStart;

    while (true) {
      const config = await this.readConfig(currentDir);
      if (config) {
        configs.push(config);
        configPaths.push(path.join(currentDir, this.CONFIG_FILENAME));
      }

      if (currentDir === normalizedStop) {
        break;
      }

      const parentDir = path.dirname(currentDir);

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
}
