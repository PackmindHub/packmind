import { PackmindCliHexa } from '../../PackmindCliHexa';
import { SummarizedArtifact } from '@packmind/types';
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

export type PullPackagesArgs = {
  packagesSlugs: string[];
};

export type PullPackagesResult = {
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  notificationSent: boolean;
};

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
