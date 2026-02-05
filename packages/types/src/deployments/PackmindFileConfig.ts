import { CodingAgent } from '../coding-agent/CodingAgent';

export type PackmindFileConfig = {
  packages: {
    [slug: string]: string;
  };
  agents?: CodingAgent[];
};

export type HierarchicalConfigResult = {
  packages: {
    [slug: string]: string;
  };
  configPaths: string[];
  hasConfigs: boolean;
};

/**
 * Represents a single packmind.json configuration with its target location.
 * The target is the directory containing the packmind.json file.
 */
export type ConfigWithTarget = {
  /** Relative path from basePath to the directory containing packmind.json (e.g., "/" or "/apps/api") */
  targetPath: string;
  /** Absolute path to the directory containing packmind.json */
  absoluteTargetPath: string;
  /** Packages defined in this specific packmind.json */
  packages: { [slug: string]: string };
  /** Optional agents to generate artifacts for (overrides org-level config) */
  agents?: CodingAgent[];
};

/**
 * Result of finding all packmind.json files in a tree (ancestors and descendants).
 */
export type AllConfigsResult = {
  /** All configs found, each with their target path */
  configs: ConfigWithTarget[];
  /** Whether any configs were found */
  hasConfigs: boolean;
  /** The base path used for computing relative target paths (git root or filesystem root) */
  basePath: string;
};
