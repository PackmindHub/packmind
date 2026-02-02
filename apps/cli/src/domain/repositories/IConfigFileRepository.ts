import {
  AllConfigsResult,
  HierarchicalConfigResult,
  PackmindFileConfig,
} from '@packmind/types';

export interface IConfigFileRepository {
  writeConfig(baseDirectory: string, config: PackmindFileConfig): Promise<void>;

  configExists(baseDirectory: string): Promise<boolean>;

  readConfig(baseDirectory: string): Promise<PackmindFileConfig | null>;

  /**
   * Recursively finds all directories containing packmind.json in descendant folders.
   * Excludes common build/dependency directories (node_modules, .git, dist, etc.)
   *
   * @param directory - The root directory to search from
   * @returns Array of directory paths that contain a packmind.json file
   */
  findDescendantConfigs(directory: string): Promise<string[]>;

  /**
   * Reads all packmind.json files from startDirectory up to stopDirectory (inclusive)
   * and merges their package configurations.
   *
   * @param startDirectory - Directory to start searching from (typically the lint target)
   * @param stopDirectory - Directory to stop searching at (typically git repo root), or null to walk to filesystem root
   * @returns Merged configuration from all found packmind.json files
   */
  readHierarchicalConfig(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<HierarchicalConfigResult>;

  /**
   * Finds all packmind.json files in the tree (both ancestors and descendants)
   * and returns each config with its target path.
   *
   * @param startDirectory - Directory to start searching from (typically the lint target)
   * @param stopDirectory - Directory to stop ancestor search at (typically git repo root), also used as base for descendants search
   * @returns All configs found with their target paths
   */
  findAllConfigsInTree(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<AllConfigsResult>;
}
