import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ConfigWithTarget } from '@packmind/types';
export type InstallHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: typeof console.log;
  error: typeof console.error;
};

/**
 * Shared helper to notify distribution if the project is in a git repository.
 * Silently ignores errors to not fail the main operation.
 */
export type StatusArgs = Record<string, never>;

export type StatusResult = {
  configs: ConfigWithTarget[];
  basePath: string;
};

/**
 * Formats a row for the overview table with aligned columns.
 */
function formatOverviewRow(
  configPath: string,
  packages: string[],
  pathColumnWidth: number,
): string {
  const paddedPath = configPath.padEnd(pathColumnWidth);
  if (packages.length === 0) {
    return `${paddedPath}  <no packages>`;
  }
  const sortedPackages = [...packages].sort((a, b) => a.localeCompare(b));
  return `${paddedPath}  ${sortedPackages.join(', ')}`;
}

/**
 * Computes the relative config path from the base path.
 * Returns paths like "./packmind.json" or "./apps/api/packmind.json"
 */
function computeDisplayPath(targetPath: string): string {
  const normalizedPath = targetPath === '/' ? '' : targetPath;
  return `.${normalizedPath}/packmind.json`;
}

export async function statusHandler(
  _args: StatusArgs,
  deps: InstallHandlerDependencies,
): Promise<StatusResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const cwd = getCwd();

  try {
    // Try to get git root, fallback to cwd
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
    const basePath = gitRoot ?? cwd;

    // Find all configs in the tree
    const result = await packmindCliHexa.findAllConfigsInTree(cwd, basePath);

    if (!result.hasConfigs) {
      log('No packmind.json available in this workspace.');
      exit(0);
      return {
        configs: [],
        basePath,
      };
    }

    // Sort configs by target path for consistent output
    const sortedConfigs = [...result.configs].sort((a, b) =>
      a.targetPath.localeCompare(b.targetPath),
    );

    // Compute display paths and find the maximum width
    const displayPaths = sortedConfigs.map((config) =>
      computeDisplayPath(config.targetPath),
    );
    const maxPathLength = Math.max(
      ...displayPaths.map((p) => p.length),
      'packmind.json'.length,
    );

    // Print title and header
    log('Workspace packages status\n');
    const header = 'packmind.json'.padEnd(maxPathLength) + '  Packages';
    const separator = '-'.repeat(header.length + 20);
    log(header);
    log(separator);

    // Print each config row and collect all packages
    const allPackages = new Set<string>();
    sortedConfigs.forEach((config, index) => {
      const displayPath = displayPaths[index];
      const packages = Object.keys(config.packages);
      packages.forEach((pkg) => allPackages.add(pkg));
      log(formatOverviewRow(displayPath, packages, maxPathLength));
    });

    // Print summary
    const uniqueCount = allPackages.size;
    const packageWord = uniqueCount === 1 ? 'package' : 'packages';
    log(`\n${uniqueCount} unique ${packageWord} currently installed.`);

    exit(0);
    return {
      configs: sortedConfigs,
      basePath,
    };
  } catch (err) {
    error('\n❌ Failed to get workspace overview:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
    return {
      configs: [],
      basePath: cwd,
    };
  }
}
