import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  CodingAgent,
  ConfigWithTarget,
  PackmindFileConfig,
  SummarizedArtifact,
} from '@packmind/types';
import {
  logWarningConsole,
  formatSlug,
  formatLabel,
} from '../utils/consoleLogger';

// Read version from package.json (bundled by esbuild)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

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
}): Promise<boolean> {
  const { packmindCliHexa, cwd, packages, log } = params;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  if (!gitRoot) {
    return false;
  }

  try {
    const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
    const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

    let relativePath = cwd.startsWith(gitRoot)
      ? cwd.slice(gitRoot.length)
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
    });
    log('Successfully notified Packmind of the new distribution');
    return true;
  } catch {
    // Silently ignore distribution notification errors
    return false;
  }
}

/**
 * Installs default skills if running at the root of a git repository.
 * Silently ignores errors to not fail the main operation.
 */
async function installDefaultSkillsIfAtGitRoot(params: {
  packmindCliHexa: PackmindCliHexa;
  cwd: string;
  log: (msg: string) => void;
}): Promise<void> {
  const { packmindCliHexa, cwd, log } = params;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

  // Only install default skills if we are at the root of a git repository
  if (!gitRoot || cwd !== gitRoot) {
    return;
  }

  try {
    log('\nInstalling default skills...');
    const skillsResult = await packmindCliHexa.installDefaultSkills({
      cliVersion: CLI_VERSION,
    });

    if (skillsResult.errors.length > 0) {
      skillsResult.errors.forEach((err) => {
        log(`   Warning: ${err}`);
      });
    }

    const totalSkillFiles =
      skillsResult.filesCreated + skillsResult.filesUpdated;
    if (totalSkillFiles > 0) {
      log(
        `Default skills: added ${skillsResult.filesCreated} files, changed ${skillsResult.filesUpdated} files`,
      );
    } else if (skillsResult.errors.length === 0) {
      log('Default skills are already up to date');
    }
  } catch {
    // Silently ignore default skills installation errors as it's a secondary operation
  }
}

export type ListPackagesArgs = Record<string, never>;

export async function listPackagesHandler(
  _args: ListPackagesArgs,
  deps: InstallHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;

  try {
    log('Fetching available packages...\n');
    const packages = await packmindCliHexa.listPackages({});

    if (packages.length === 0) {
      log('No packages found.');
      exit(0);
      return;
    }

    // Sort packages alphabetically by slug
    const sortedPackages = [...packages].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );

    log('Available packages:\n');
    sortedPackages.forEach((pkg, index) => {
      log(`- ${formatSlug(pkg.slug)}`);
      log(`    ${formatLabel('Name:')} ${pkg.name}`);
      if (pkg.description) {
        const descriptionLines = pkg.description
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const [firstLine, ...restLines] = descriptionLines;
        log(`    ${formatLabel('Description:')} ${firstLine}`);
        restLines.forEach((line) => {
          log(`                 ${line}`);
        });
      }
      // Add blank line between packages (but not after the last one)
      if (index < sortedPackages.length - 1) {
        log('');
      }
    });

    const exampleSlug = formatSlug(sortedPackages[0].slug);
    log('\nHow to install a package:\n');
    log(`  $ packmind-cli install ${exampleSlug}`);
    exit(0);
  } catch (err) {
    error('\n❌ Failed to list packages:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
  }
}

export type ShowPackageArgs = {
  slug: string;
};

export async function showPackageHandler(
  args: ShowPackageArgs,
  deps: InstallHandlerDependencies,
): Promise<void> {
  const { packmindCliHexa, exit, log, error } = deps;
  const { slug } = args;

  try {
    log(`Fetching package details for '${slug}'...\n`);
    const pkg = await packmindCliHexa.getPackageBySlug({ slug });

    // Display package name and slug
    log(`${pkg.name} (${pkg.slug}):\n`);

    // Display description if available
    if (pkg.description) {
      log(`${pkg.description}\n`);
    }

    // Display standards
    if (pkg.standards && pkg.standards.length > 0) {
      log('Standards:');
      pkg.standards.forEach((standard: SummarizedArtifact) => {
        if (standard.summary) {
          log(`  - ${standard.name}: ${standard.summary}`);
        } else {
          log(`  - ${standard.name}`);
        }
      });
      log('');
    }

    // Display recipes
    if (pkg.recipes && pkg.recipes.length > 0) {
      log('Commands:');
      pkg.recipes.forEach((recipe: SummarizedArtifact) => {
        if (recipe.summary) {
          log(`  - ${recipe.name}: ${recipe.summary}`);
        } else {
          log(`  - ${recipe.name}`);
        }
      });
      log('');
    }

    exit(0);
  } catch (err) {
    error('\n❌ Failed to fetch package details:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
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

export type InstallPackagesArgs = {
  packagesSlugs: string[];
};

export type InstallPackagesResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  notificationSent: boolean;
};

export type UninstallPackagesArgs = {
  packagesSlugs: string[];
};

export type UninstallPackagesResult = {
  filesDeleted: number;
  packagesUninstalled: string[];
};

export type RecursiveInstallArgs = Record<string, never>;

export type RecursiveInstallResult = {
  directoriesProcessed: number;
  totalFilesCreated: number;
  totalFilesUpdated: number;
  totalFilesDeleted: number;
  totalNotifications: number;
  errors: { directory: string; message: string }[];
};

type SingleDirectoryInstallResult = {
  success: boolean;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  notificationSent: boolean;
  errorMessage?: string;
};

/**
 * Internal function to execute install for a single directory.
 * Does not call exit() - returns result for caller to handle.
 */
async function executeInstallForDirectory(
  directory: string,
  deps: Omit<InstallHandlerDependencies, 'exit'>,
): Promise<SingleDirectoryInstallResult> {
  const { packmindCliHexa, log } = deps;

  // Read existing config (including agents if present)
  let configPackages: string[];
  let configAgents: CodingAgent[] | undefined;
  try {
    const fullConfig = await packmindCliHexa.readFullConfig(directory);
    if (fullConfig) {
      configPackages = Object.keys(fullConfig.packages);
      configAgents = fullConfig.agents;
    } else {
      configPackages = [];
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
      errorMessage: `Failed to parse packmind.json: ${errorMessage}`,
    };
  }

  // Skip if no packages configured
  if (configPackages.length === 0) {
    return {
      success: true,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
    };
  }

  try {
    // Show fetching message
    const packageCount = configPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    log(
      `  Fetching ${packageCount} ${packageWord}: ${configPackages.join(', ')}...`,
    );

    // Execute the install operation
    // Pass previous packages for change detection (same as current since we're pulling existing config)
    const result = await packmindCliHexa.installPackages({
      baseDirectory: directory,
      packagesSlugs: configPackages,
      previousPackagesSlugs: configPackages, // Pass for consistency
      agents: configAgents, // Pass agents from config if present
    });

    // Show installation message with counts
    const parts = [];
    if (result.recipesCount > 0) parts.push(`${result.recipesCount} commands`);
    if (result.standardsCount > 0)
      parts.push(`${result.standardsCount} standards`);
    if (result.skillsCount > 0) parts.push(`${result.skillsCount} skills`);
    log(`  Installing ${parts.join(', ') || 'artifacts'}...`);

    // Display results
    log(
      `  added ${result.filesCreated} files, changed ${result.filesUpdated} files, removed ${result.filesDeleted} files`,
    );

    if (result.errors.length > 0) {
      return {
        success: false,
        filesCreated: result.filesCreated,
        filesUpdated: result.filesUpdated,
        filesDeleted: result.filesDeleted,
        notificationSent: false,
        errorMessage: result.errors.join(', '),
      };
    }

    // Notify distribution if files were created, updated or deleted (including skill directories)
    const skillDirsDeleted = result.skillDirectoriesDeleted || 0;
    let notificationSent = false;
    if (
      result.filesCreated > 0 ||
      result.filesUpdated > 0 ||
      result.filesDeleted > 0 ||
      skillDirsDeleted > 0
    ) {
      notificationSent = await notifyDistributionIfInGitRepo({
        packmindCliHexa,
        cwd: directory,
        packages: configPackages,
        log: () => {
          /* empty */
        },
      });
    }

    return {
      success: true,
      filesCreated: result.filesCreated,
      filesUpdated: result.filesUpdated,
      filesDeleted: result.filesDeleted + skillDirsDeleted,
      notificationSent,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
      errorMessage,
    };
  }
}

export async function installPackagesHandler(
  args: InstallPackagesArgs,
  deps: InstallHandlerDependencies,
): Promise<InstallPackagesResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const { packagesSlugs } = args;
  const cwd = getCwd();

  // Read existing config (including agents if present)
  let configPackages: string[];
  let configAgents: CodingAgent[] | undefined;
  let configFileExists = false;
  try {
    configFileExists = await packmindCliHexa.configExists(cwd);
    const fullConfig = await packmindCliHexa.readFullConfig(cwd);
    if (fullConfig) {
      // Check for non-wildcard versions and warn the user
      const hasNonWildcardVersions = Object.values(fullConfig.packages).some(
        (version) => version !== '*',
      );
      if (hasNonWildcardVersions) {
        logWarningConsole(
          'Package versions are not supported yet, getting the latest version',
        );
      }
      configPackages = Object.keys(fullConfig.packages);
      configAgents = fullConfig.agents;
    } else {
      configPackages = [];
    }
  } catch (err) {
    error('ERROR Failed to parse packmind.json');
    if (err instanceof Error) {
      error(`ERROR ${err.message}`);
    } else {
      error(`ERROR ${String(err)}`);
    }
    error('\n💡 Please fix the packmind.json file or delete it to continue.');
    exit(1);
    return {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
    };
  }

  // Merge config packages with command line args
  const allPackages = [...new Set([...configPackages, ...packagesSlugs])];

  // Show help if no packages from either source
  if (allPackages.length === 0) {
    if (configFileExists) {
      logWarningConsole(
        'config packmind.json is empty, no packages to install',
      );
    } else {
      logWarningConsole('config packmind.json not found');
    }
    log('Usage: packmind-cli install <package-slug> [package-slug...]');
    log('       packmind-cli install --list');
    log('');
    log('Examples:');
    log('  packmind-cli install backend');
    log('  packmind-cli install backend frontend');
    log('  packmind-cli install --list  # Show available packages');
    log('');
    log('Install commands and standards from the specified packages.');
    exit(0);
    return {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
    };
  }

  // Log config status only if initializing
  if (!configFileExists && packagesSlugs.length > 0) {
    log('INFO initializing packmind.json');
  }

  try {
    // Show fetching message
    const packageCount = allPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    log(
      `Fetching ${packageCount} ${packageWord}: ${allPackages.join(', ')}...`,
    );

    // Collect git info for distribution history lookup (to detect skills removed from packages)
    let gitRemoteUrl: string | undefined;
    let gitBranch: string | undefined;
    let relativePath: string | undefined;

    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
    if (gitRoot) {
      try {
        gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
        gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

        relativePath = cwd.startsWith(gitRoot)
          ? cwd.slice(gitRoot.length)
          : '/';
        if (!relativePath.startsWith('/')) {
          relativePath = '/' + relativePath;
        }
        if (!relativePath.endsWith('/')) {
          relativePath = relativePath + '/';
        }
      } catch {
        // Git info collection failed, continue without it
      }
    }

    // Execute the install operation to get counts first
    // Pass previous packages for change detection
    const result = await packmindCliHexa.installPackages({
      baseDirectory: cwd,
      packagesSlugs: allPackages,
      previousPackagesSlugs: configPackages, // Pass previous config for change detection
      gitRemoteUrl,
      gitBranch,
      relativePath,
      agents: configAgents, // Pass agents from config if present (overrides org-level)
    });

    // Show installation message with counts
    const parts = [];
    if (result.recipesCount > 0) parts.push(`${result.recipesCount} commands`);
    if (result.standardsCount > 0)
      parts.push(`${result.standardsCount} standards`);
    if (result.skillsCount > 0) parts.push(`${result.skillsCount} skills`);
    log(`Installing ${parts.join(', ') || 'artifacts'}...`);

    // Display results (include skill directories in deletion count)
    const skillDirsDeleted = result.skillDirectoriesDeleted || 0;
    const totalDeleted = result.filesDeleted + skillDirsDeleted;
    log(
      `\nadded ${result.filesCreated} files, changed ${result.filesUpdated} files, removed ${totalDeleted} files`,
    );

    if (result.errors.length > 0) {
      log('\n⚠️  Errors encountered:');
      result.errors.forEach((err) => {
        log(`   - ${err}`);
      });
      exit(1);
      return {
        filesCreated: result.filesCreated,
        filesUpdated: result.filesUpdated,
        filesDeleted: totalDeleted,
        notificationSent: false,
      };
    }

    // Notify distribution if files were created, updated or deleted (including skill directories)
    let notificationSent = false;
    if (
      result.filesCreated > 0 ||
      result.filesUpdated > 0 ||
      result.filesDeleted > 0 ||
      skillDirsDeleted > 0
    ) {
      notificationSent = await notifyDistributionIfInGitRepo({
        packmindCliHexa,
        cwd,
        packages: allPackages,
        log,
      });
    }

    // Install default skills if running at the root of a git repository
    await installDefaultSkillsIfAtGitRoot({ packmindCliHexa, cwd, log });

    return {
      filesCreated: result.filesCreated,
      filesUpdated: result.filesUpdated,
      filesDeleted: totalDeleted,
      notificationSent,
    };
  } catch (err) {
    error('\n❌ Failed to install content:');

    if (err instanceof Error) {
      const errorObj = err as Error & { statusCode?: number };

      // Handle 400 errors specifically (validation errors)
      if (errorObj.statusCode === 400) {
        error(`   ${errorObj.message}`);
        error('\n💡 This is a validation error. Please check:');
        error('   - The command syntax is correct');
        error('   - You have provided at least one package slug');
        error('   - Your packmind.json file contains valid package slugs');
      }
      // Handle 404 errors specifically (package not found)
      else if (errorObj.statusCode === 404) {
        error(`   ${errorObj.message}`);

        // If package comes from config, suggest removing it
        if (configFileExists && configPackages.length > 0) {
          const missingPackages = allPackages.filter((pkg) =>
            configPackages.includes(pkg),
          );
          if (missingPackages.length > 0) {
            error(
              '\n💡 Either remove the following package(s) from packmind.json:',
            );
            missingPackages.forEach((pkg) => {
              error(`     "${pkg}"`);
            });
            error('   Or ensure that:');
            error('     - The package slug exists and is correctly spelled');
            error('     - The package exists in your organization');
            error('     - You have the correct API key configured');
          } else {
            error('\n💡 Troubleshooting tips:');
            error(
              '   - Check if the package slug exists and is correctly spelled',
            );
            error('   - Check that the package exists in your organization');
            error('   - Ensure you have the correct API key configured');
          }
        } else {
          error('\n💡 Troubleshooting tips:');
          error(
            '   - Check if the package slug exists and is correctly spelled',
          );
          error('   - Check that the package exists in your organization');
          error('   - Ensure you have the correct API key configured');
        }
      } else {
        error(`   ${errorObj.message}`);

        // Check if it's an API error with additional details
        const apiErrorObj = err as Error & {
          response?: { data?: { message?: string } };
        };
        if (apiErrorObj.response?.data?.message) {
          error(`\n   Details: ${apiErrorObj.response.data.message}`);
        }

        error('\n💡 Troubleshooting tips:');
        error('   - Verify that the package slugs are correct');
        error('   - Check that the packages exist in your organization');
        error('   - Ensure you have the correct API key configured');
      }
    } else {
      error(`   ${String(err)}`);
    }

    exit(1);
    return {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
    };
  }
}

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

  // Read existing config
  let configPackages: PackmindFileConfig['packages'];
  let configFileExists = false;
  try {
    configFileExists = await packmindCliHexa.configExists(cwd);
    const config = await packmindCliHexa.readConfig(cwd);
    configPackages = config.packages;
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

  // Check which packages to uninstall are actually installed
  const packagesToUninstall = packagesSlugs.filter(
    (slug) => slug in configPackages,
  );
  const notInstalledPackages = packagesSlugs.filter(
    (slug) => !(slug in configPackages),
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

export async function recursiveInstallHandler(
  _args: RecursiveInstallArgs,
  deps: InstallHandlerDependencies,
): Promise<RecursiveInstallResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const cwd = getCwd();

  const result: RecursiveInstallResult = {
    directoriesProcessed: 0,
    totalFilesCreated: 0,
    totalFilesUpdated: 0,
    totalFilesDeleted: 0,
    totalNotifications: 0,
    errors: [],
  };

  try {
    // Try to get git root, fallback to cwd
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
    const basePath = gitRoot ?? cwd;

    // Find all configs in the tree (current directory + descendants)
    const allConfigs = await packmindCliHexa.findAllConfigsInTree(
      cwd,
      basePath,
    );

    if (!allConfigs.hasConfigs) {
      log('No packmind.json files found in this repository.');
      log('');
      log('Usage: packmind-cli install -r');
      log('');
      log(
        'This command requires at least one packmind.json file in the repository.',
      );
      log('Create a packmind.json file first:');
      log('');
      log('  packmind-cli install <package-slug>');
      exit(0);
      return result;
    }

    // Sort configs by target path for consistent processing order
    const sortedConfigs = [...allConfigs.configs].sort((a, b) =>
      a.targetPath.localeCompare(b.targetPath),
    );

    log(`Found ${sortedConfigs.length} packmind.json file(s) to process\n`);

    // Process each directory
    for (const config of sortedConfigs) {
      const displayPath = computeDisplayPath(config.targetPath);
      log(`Installing in ${displayPath}...`);

      const installResult = await executeInstallForDirectory(
        config.absoluteTargetPath,
        { packmindCliHexa, getCwd, log, error },
      );

      result.directoriesProcessed++;
      result.totalFilesCreated += installResult.filesCreated;
      result.totalFilesUpdated += installResult.filesUpdated;
      result.totalFilesDeleted += installResult.filesDeleted;
      if (installResult.notificationSent) {
        result.totalNotifications++;
      }

      if (!installResult.success && installResult.errorMessage) {
        result.errors.push({
          directory: displayPath,
          message: installResult.errorMessage,
        });
        error(`  Error: ${installResult.errorMessage}`);
      }

      log(''); // Add blank line between directories
    }

    // Print summary
    const dirWord =
      result.directoriesProcessed === 1 ? 'directory' : 'directories';
    log(
      `Summary: ${result.directoriesProcessed} ${dirWord} processed, ` +
        `${result.totalFilesCreated} files added, ` +
        `${result.totalFilesUpdated} changed, ` +
        `${result.totalFilesDeleted} removed`,
    );

    // Print notification summary if any notifications were sent
    if (result.totalNotifications > 0) {
      const distWord =
        result.totalNotifications === 1 ? 'distribution' : 'distributions';
      log(`Notified Packmind of ${result.totalNotifications} ${distWord}`);
    }

    if (result.errors.length > 0) {
      log('');
      log(`⚠️  ${result.errors.length} error(s) encountered:`);
      result.errors.forEach((err) => {
        log(`   - ${err.directory}: ${err.message}`);
      });
      exit(1);
      return result;
    }

    exit(0);
    return result;
  } catch (err) {
    error('\n❌ Failed to run recursive install:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
    return result;
  }
}
