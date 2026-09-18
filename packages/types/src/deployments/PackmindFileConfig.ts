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
 * One packmind.json, plus the directory it was found in — both paths point at
 * that directory, not at the file.
 */
export type ConfigWithTarget = {
  /** Relative to `AllConfigsResult.basePath`, e.g. "/" or "/apps/api". */
  targetPath: string;
  absoluteTargetPath: string;
  packages: { [slug: string]: string };
  /** Overrides the org-level agent config when present. */
  agents?: CodingAgent[];
};

/**
 * Every packmind.json found in the tree — ancestors as well as descendants.
 */
export type AllConfigsResult = {
  configs: ConfigWithTarget[];
  hasConfigs: boolean;
  /** Git root, or the filesystem root when there is none. */
  basePath: string;
};
