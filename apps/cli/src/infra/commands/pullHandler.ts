import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ConfigWithTarget, SummarizedArtifact } from '@packmind/types';
import {
  logWarningConsole,
  formatSlug,
  formatLabel,
} from '../utils/consoleLogger';

export type PullHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: typeof console.log;
  error: typeof console.error;
};

export type ListPackagesArgs = Record<string, never>;

export async function listPackagesHandler(
  _args: ListPackagesArgs,
  deps: PullHandlerDependencies,
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
  deps: PullHandlerDependencies,
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
      log('Recipes:');
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
  deps: PullHandlerDependencies,
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

export type PullPackagesArgs = {
  packagesSlugs: string[];
};

export type PullPackagesResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  notificationSent: boolean;
};

export type RecursivePullArgs = Record<string, never>;

export type RecursivePullResult = {
  directoriesProcessed: number;
  totalFilesCreated: number;
  totalFilesUpdated: number;
  totalFilesDeleted: number;
  errors: { directory: string; message: string }[];
};

type SingleDirectoryPullResult = {
  success: boolean;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  errorMessage?: string;
};

/**
 * Internal function to execute pull for a single directory.
 * Does not call exit() - returns result for caller to handle.
 */
async function executePullForDirectory(
  directory: string,
  deps: Omit<PullHandlerDependencies, 'exit'>,
): Promise<SingleDirectoryPullResult> {
  const { packmindCliHexa, log } = deps;

  // Read existing config
  let configPackages: string[];
  try {
    configPackages = await packmindCliHexa.readConfig(directory);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
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
    };
  }

  try {
    // Show fetching message
    const packageCount = configPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    log(
      `  Fetching ${packageCount} ${packageWord}: ${configPackages.join(', ')}...`,
    );

    // Execute the pull operation
    const result = await packmindCliHexa.pullData({
      baseDirectory: directory,
      packagesSlugs: configPackages,
    });

    // Show installation message with counts
    log(
      `  Installing ${result.recipesCount} recipes and ${result.standardsCount} standards...`,
    );

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
        errorMessage: result.errors.join(', '),
      };
    }

    // Write config with all packages that were successfully pulled
    await packmindCliHexa.writeConfig(directory, configPackages);

    // Notify distribution if files were created or updated and we're in a git repo
    if (result.filesCreated > 0 || result.filesUpdated > 0) {
      const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(directory);

      if (gitRoot) {
        try {
          const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
          const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

          // Calculate relative path from git root to current directory
          let relativePath = directory.startsWith(gitRoot)
            ? directory.slice(gitRoot.length)
            : '/';
          if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
          }
          if (!relativePath.endsWith('/')) {
            relativePath = relativePath + '/';
          }

          await packmindCliHexa.notifyDistribution({
            distributedPackages: configPackages,
            gitRemoteUrl,
            gitBranch,
            relativePath,
          });
        } catch {
          // Silently ignore distribution notification errors
        }
      }
    }

    return {
      success: true,
      filesCreated: result.filesCreated,
      filesUpdated: result.filesUpdated,
      filesDeleted: result.filesDeleted,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      errorMessage,
    };
  }
}

export async function pullPackagesHandler(
  args: PullPackagesArgs,
  deps: PullHandlerDependencies,
): Promise<PullPackagesResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const { packagesSlugs } = args;
  const cwd = getCwd();

  // Read existing config
  let configPackages: string[];
  let configExists = false;
  try {
    configPackages = await packmindCliHexa.readConfig(cwd);
    configExists = configPackages.length > 0;
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
    logWarningConsole('config packmind.json not found');
    log('Usage: packmind-cli install <package-slug> [package-slug...]');
    log('       packmind-cli install --list');
    log('');
    log('Examples:');
    log('  packmind-cli install backend');
    log('  packmind-cli install backend frontend');
    log('  packmind-cli install --list  # Show available packages');
    log('');
    log('Install recipes and standards from the specified packages.');
    exit(0);
    return {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      notificationSent: false,
    };
  }

  // Log config status only if initializing
  if (!configExists && packagesSlugs.length > 0) {
    log('INFO initializing packmind.json');
  }

  try {
    // Show fetching message
    const packageCount = allPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    log(
      `Fetching ${packageCount} ${packageWord}: ${allPackages.join(', ')}...`,
    );

    // Execute the pull operation to get counts first
    const result = await packmindCliHexa.pullData({
      baseDirectory: cwd,
      packagesSlugs: allPackages,
    });

    // Show installation message with counts
    log(
      `Installing ${result.recipesCount} recipes and ${result.standardsCount} standards...`,
    );

    // Display results
    log(
      `\nadded ${result.filesCreated} files, changed ${result.filesUpdated} files, removed ${result.filesDeleted} files`,
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
        filesDeleted: result.filesDeleted,
        notificationSent: false,
      };
    }

    // Write config with all packages that were successfully pulled
    await packmindCliHexa.writeConfig(cwd, allPackages);

    // Notify distribution if files were created or updated and we're in a git repo
    let notificationSent = false;
    if (result.filesCreated > 0 || result.filesUpdated > 0) {
      const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

      if (gitRoot) {
        try {
          const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
          const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

          // Calculate relative path from git root to current directory
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
            distributedPackages: allPackages,
            gitRemoteUrl,
            gitBranch,
            relativePath,
          });
          log('Successfully notified Packmind of the new distribution');
          notificationSent = true;
        } catch {
          // Silently ignore distribution notification errors
          // The pull was successful, we don't want to fail the command
        }
      }
    }

    return {
      filesCreated: result.filesCreated,
      filesUpdated: result.filesUpdated,
      filesDeleted: result.filesDeleted,
      notificationSent,
    };
  } catch (err) {
    error('\n❌ Failed to install content:');

    if (err instanceof Error) {
      const errorObj = err as Error & { statusCode?: number };

      // Handle 404 errors specifically (package not found)
      if (errorObj.statusCode === 404) {
        error(`   ${errorObj.message}`);

        // If package comes from config, suggest removing it
        if (configExists && configPackages.length > 0) {
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

export async function recursivePullHandler(
  _args: RecursivePullArgs,
  deps: PullHandlerDependencies,
): Promise<RecursivePullResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
  const cwd = getCwd();

  const result: RecursivePullResult = {
    directoriesProcessed: 0,
    totalFilesCreated: 0,
    totalFilesUpdated: 0,
    totalFilesDeleted: 0,
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
      log('No packmind.json files found in this workspace.');
      log('');
      log('Usage: packmind-cli install -r');
      log('');
      log(
        'This command requires at least one packmind.json file in the current',
      );
      log(
        'directory or its subdirectories. Create a packmind.json file first:',
      );
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

      const pullResult = await executePullForDirectory(
        config.absoluteTargetPath,
        { packmindCliHexa, getCwd, log, error },
      );

      result.directoriesProcessed++;
      result.totalFilesCreated += pullResult.filesCreated;
      result.totalFilesUpdated += pullResult.filesUpdated;
      result.totalFilesDeleted += pullResult.filesDeleted;

      if (!pullResult.success && pullResult.errorMessage) {
        result.errors.push({
          directory: displayPath,
          message: pullResult.errorMessage,
        });
        error(`  Error: ${pullResult.errorMessage}`);
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
