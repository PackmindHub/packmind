import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  CodingAgent,
  ConfigWithTarget,
  PackmindFileConfig,
} from '@packmind/types';

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
async function notifyDistributionIfInGitRepo(params: {
  packmindCliHexa: PackmindCliHexa;
  cwd: string;
  packages: string[];
  log: (msg: string) => void;
  agents?: CodingAgent[];
  gitRoot?: string;
}): Promise<boolean> {
  const { packmindCliHexa, cwd, packages, log, agents } = params;

  const resolvedGitRoot =
    params.gitRoot ?? (await packmindCliHexa.tryGetGitRepositoryRoot(cwd));
  if (!resolvedGitRoot) {
    return false;
  }

  try {
    const gitRemoteUrl =
      packmindCliHexa.getGitRemoteUrlFromPath(resolvedGitRoot);
    const gitBranch = packmindCliHexa.getCurrentBranch(resolvedGitRoot);

    let relativePath = cwd.startsWith(resolvedGitRoot)
      ? cwd.slice(resolvedGitRoot.length)
      : '/';
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    if (!relativePath.endsWith('/')) {
      relativePath = relativePath + '/';
    }

    await packmindCliHexa.notifyDistribution({
      distributedPackages: packages,
      gitRemoteUrl,
      gitBranch,
      relativePath,
      agents,
    });
    log('Successfully notified Packmind of the new distribution');
    return true;
  } catch {
    // Silently ignore distribution notification errors
    return false;
  }
}

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

export type UninstallPackagesArgs = {
  packagesSlugs: string[];
};

export type UninstallPackagesResult = {
  filesDeleted: number;
  packagesUninstalled: string[];
};

export async function uninstallPackagesHandler(
  args: UninstallPackagesArgs,
  deps: InstallHandlerDependencies,
): Promise<UninstallPackagesResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const { packagesSlugs } = args;
  const cwd = getCwd();

  // Validate that package slugs were provided
  if (!packagesSlugs || packagesSlugs.length === 0) {
    error('❌ No packages specified.');
    log('');
    log('Usage: packmind-cli uninstall <package-slug> [package-slug...]');
    log('       packmind-cli remove <package-slug> [package-slug...]');
    log('');
    log('Examples:');
    log('  packmind-cli uninstall backend');
    log('  packmind-cli remove backend frontend');
    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }

  // Read existing config (including agents if present)
  let configPackages: PackmindFileConfig['packages'];
  let configAgents: CodingAgent[] | undefined;
  let configFileExists = false;
  try {
    configFileExists = await packmindCliHexa.configExists(cwd);
    const fullConfig = await packmindCliHexa.readFullConfig(cwd);
    if (fullConfig) {
      configPackages = fullConfig.packages;
      configAgents = fullConfig.agents;
    } else {
      configPackages = {};
    }
  } catch (err) {
    error('❌ Failed to read packmind.json');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    error('\n💡 Please fix the packmind.json file or delete it to continue.');
    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }

  // Check if config exists or is empty
  if (Object.keys(configPackages).length === 0) {
    if (configFileExists) {
      error('❌ packmind.json is empty.');
    } else {
      error('❌ No packmind.json found in current directory.');
    }
    log('');
    log('💡 There are no packages to uninstall.');
    log('   To install packages, run: packmind-cli install <package-slug>');
    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }

  // Normalize slugs for space-aware matching (handles @space/pkg vs pkg forms)
  let normalizedRequestedSlugs: string[];
  let normalizedConfigSlugs: string[];
  try {
    normalizedRequestedSlugs =
      await packmindCliHexa.normalizePackageSlugs(packagesSlugs);
    normalizedConfigSlugs = await packmindCliHexa.normalizePackageSlugs(
      Object.keys(configPackages),
    );
  } catch (err) {
    error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }

  // Build a map: normalized config key → original config key
  const normalizedToOriginalConfigKey = new Map<string, string>();
  Object.keys(configPackages).forEach((originalKey, index) => {
    normalizedToOriginalConfigKey.set(
      normalizedConfigSlugs[index],
      originalKey,
    );
  });

  // Find which requested slugs exist in config (matching by normalized form)
  const packagesToUninstall = normalizedRequestedSlugs
    .filter((slug) => normalizedToOriginalConfigKey.has(slug))
    .map((slug) => normalizedToOriginalConfigKey.get(slug)!);

  // Find which requested slugs are NOT in config (for warning display)
  const notInstalledPackages = packagesSlugs.filter(
    (_, i) => !normalizedToOriginalConfigKey.has(normalizedRequestedSlugs[i]),
  );

  // Warn about packages that aren't installed
  if (notInstalledPackages.length > 0) {
    const packageWord =
      notInstalledPackages.length === 1 ? 'package' : 'packages';
    log(
      `⚠️  Warning: The following ${packageWord} ${notInstalledPackages.length === 1 ? 'is' : 'are'} not installed:`,
    );
    notInstalledPackages.forEach((pkg) => {
      log(`   - ${pkg}`);
    });
    log('');
  }

  // If no packages to uninstall, exit
  if (packagesToUninstall.length === 0) {
    error('❌ No packages to uninstall.');
    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }

  try {
    // Show uninstalling message
    const packageCount = packagesToUninstall.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    log(
      `Uninstalling ${packageCount} ${packageWord}: ${packagesToUninstall.join(', ')}...`,
    );

    // Calculate remaining packages after removal
    const remainingPackages = Object.keys(configPackages).filter(
      (pkg) => !packagesToUninstall.includes(pkg),
    );

    let filesDeleted = 0;

    // Handle special case: removing ALL packages
    if (remainingPackages.length === 0) {
      log('Removing all packages and cleaning up...');

      // Call installPackages with empty array to trigger proper cleanup via backend API
      // This ensures all deployer artifacts (.cursor, .continue, .github, etc.) are removed
      const result = await packmindCliHexa.installPackages({
        baseDirectory: cwd,
        packagesSlugs: [],
        previousPackagesSlugs: Object.keys(configPackages),
        agents: configAgents,
      });

      // Display results
      log(`\nremoved ${result.filesDeleted} files`);

      if (result.errors.length > 0) {
        log('\n⚠️  Errors encountered:');
        result.errors.forEach((err) => {
          log(`   - ${err}`);
        });
        exit(1);
        return {
          filesDeleted: result.filesDeleted,
          packagesUninstalled: packagesToUninstall,
        };
      }

      filesDeleted = result.filesDeleted;
    } else {
      // Normal case: some packages remain
      // Execute the install operation with remaining packages
      // Pass all previous packages so removed ones are detected
      const result = await packmindCliHexa.installPackages({
        baseDirectory: cwd,
        packagesSlugs: remainingPackages,
        previousPackagesSlugs: Object.keys(configPackages),
        agents: configAgents,
      });

      // Show removal message with counts
      if (result.recipesCount > 0 || result.standardsCount > 0) {
        log(
          `Removing ${result.recipesCount} commands and ${result.standardsCount} standards...`,
        );
      }

      // Display results
      log(`\nremoved ${result.filesDeleted} files`);

      if (result.errors.length > 0) {
        log('\n⚠️  Errors encountered:');
        result.errors.forEach((err) => {
          log(`   - ${err}`);
        });
        exit(1);
        return {
          filesDeleted: result.filesDeleted,
          packagesUninstalled: packagesToUninstall,
        };
      }

      filesDeleted = result.filesDeleted;
    }

    // Write config with remaining packages
    await packmindCliHexa.writeConfig(cwd, remainingPackages);

    // Notify distribution with remaining packages so backend can detect removals
    await notifyDistributionIfInGitRepo({
      packmindCliHexa,
      cwd,
      packages: remainingPackages,
      log,
    });

    // Show success message
    log('');
    if (packagesToUninstall.length === 1) {
      log(`✓ Package '${packagesToUninstall[0]}' has been uninstalled.`);
    } else {
      log(`✓ ${packagesToUninstall.length} packages have been uninstalled.`);
    }

    if (remainingPackages.length === 0) {
      log('');
      log('💡 All packages have been uninstalled.');
      log('   Your packmind.json still exists but contains no packages.');
    }

    return {
      filesDeleted,
      packagesUninstalled: packagesToUninstall,
    };
  } catch (err) {
    error('\n❌ Failed to uninstall packages:');

    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }

    exit(1);
    return {
      filesDeleted: 0,
      packagesUninstalled: [],
    };
  }
}
