import { PackmindFileConfig } from '@packmind/types';
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
}
