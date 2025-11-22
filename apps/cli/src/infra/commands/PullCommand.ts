import { command, restPositionals, string, flag, option } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { SummarizedArtifact } from '@packmind/types';

export const pullCommand = command({
  name: 'pull',
  description:
    'Pull recipes and standards from specified packages and save them to the current directory',
  args: {
    list: flag({
      long: 'list',
      description: 'List available packages',
    }),
    show: option({
      type: string,
      long: 'show',
      description: 'Show details of a specific package',
      defaultValue: () => '',
    }),
    packagesSlugs: restPositionals({
      type: string,
      displayName: 'packages',
      description:
        'Package slugs to pull content from (e.g., backend frontend)',
    }),
  },
  handler: async ({ list, show, packagesSlugs }) => {
    // Initialize hexa and logger
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    // Handle --list flag
    if (list) {
      try {
        console.log('Fetching available packages...\n');
        const packages = await packmindCliHexa.listPackages({});

        if (packages.length === 0) {
          console.log('No packages found.');
          process.exit(0);
        }

        console.log('Available packages:');
        packages.forEach((pkg) => {
          console.log(`  - ${pkg.slug}: ${pkg.description || pkg.name}`);
        });
        process.exit(0);
      } catch (error) {
        console.error('\n❌ Failed to list packages:');
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        } else {
          console.error(`   ${String(error)}`);
        }
        process.exit(1);
      }
    }

    // Handle --show option
    if (show) {
      try {
        console.log(`Fetching package details for '${show}'...\n`);
        const pkg = await packmindCliHexa.getPackageBySlug({ slug: show });

        // Display package name and slug
        console.log(`${pkg.name} (${pkg.slug}):\n`);

        // Display description if available
        if (pkg.description) {
          console.log(`${pkg.description}\n`);
        }

        // Display standards
        if (pkg.standards && pkg.standards.length > 0) {
          console.log('Standards:');
          pkg.standards.forEach((standard: SummarizedArtifact) => {
            if (standard.summary) {
              console.log(`  - ${standard.name}: ${standard.summary}`);
            } else {
              console.log(`  - ${standard.name}`);
            }
          });
          console.log('');
        }

        // Display recipes
        if (pkg.recipes && pkg.recipes.length > 0) {
          console.log('Recipes:');
          pkg.recipes.forEach((recipe: SummarizedArtifact) => {
            if (recipe.summary) {
              console.log(`  - ${recipe.name}: ${recipe.summary}`);
            } else {
              console.log(`  - ${recipe.name}`);
            }
          });
          console.log('');
        }

        process.exit(0);
      } catch (error) {
        console.error('\n❌ Failed to fetch package details:');
        if (error instanceof Error) {
          console.error(`   ${error.message}`);
        } else {
          console.error(`   ${String(error)}`);
        }
        process.exit(1);
      }
    }

    // Read existing config
    let configPackages: string[];
    let configExists = false;
    try {
      configPackages = await packmindCliHexa.readConfig(process.cwd());
      configExists = configPackages.length > 0;
    } catch (error) {
      console.error('ERR! code EJSONPARSE');
      console.error('ERR! Failed to parse packmind.json\n');
      console.error('❌ Error reading packmind.json:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      } else {
        console.error(`   ${String(error)}`);
      }
      console.error(
        '\n💡 Please fix the packmind.json file or delete it to continue.',
      );
      process.exit(1);
    }

    // Merge config packages with command line args
    const allPackages = [...new Set([...configPackages, ...packagesSlugs])];

    // Show help if no packages from either source
    if (allPackages.length === 0) {
      console.log('WARN config packmind.json not found');
      console.log('Usage: packmind-cli pull <package-slug> [package-slug...]');
      console.log('       packmind-cli pull --list');
      console.log('');
      console.log('Examples:');
      console.log('  packmind-cli pull backend');
      console.log('  packmind-cli pull backend frontend');
      console.log('  packmind-cli pull --list  # Show available packages');
      console.log('');
      console.log('Pull recipes and standards from the specified packages.');
      process.exit(0);
    }

    // Log config status
    if (configExists) {
      console.log('info using packmind.json');
    } else if (packagesSlugs.length > 0) {
      console.log('WARN config packmind.json not found, creating one');
    }

    console.log(`Pulling content from packages: ${allPackages.join(', ')}...`);

    try {
      // Execute the pull operation
      const result = await packmindCliHexa.pullData({
        baseDirectory: process.cwd(),
        packagesSlugs: allPackages,
      });

      // Display results
      console.log('\n✅ Pull completed successfully!');
      console.log(`   Files created: ${result.filesCreated}`);
      console.log(`   Files updated: ${result.filesUpdated}`);
      console.log(`   Files deleted: ${result.filesDeleted}`);

      if (result.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        result.errors.forEach((error) => {
          console.log(`   - ${error}`);
        });
        process.exit(1);
      }

      // Write config with all packages that were successfully pulled
      await packmindCliHexa.writeConfig(process.cwd(), allPackages);
    } catch (error) {
      console.error('\n❌ Failed to pull content:');

      if (error instanceof Error) {
        const errorObj = error as Error & { statusCode?: number };

        // Handle 404 errors specifically (package not found)
        if (errorObj.statusCode === 404) {
          console.error(`   ${errorObj.message}`);
          console.error(
            '\n💡 Use `packmind-cli pull --list` to show available packages',
          );
        } else {
          console.error(`   ${errorObj.message}`);

          // Check if it's an API error with additional details
          const apiErrorObj = error as Error & {
            response?: { data?: { message?: string } };
          };
          if (apiErrorObj.response?.data?.message) {
            console.error(`\n   Details: ${apiErrorObj.response.data.message}`);
          }

          console.error('\n💡 Troubleshooting tips:');
          console.error('   - Verify that the package slugs are correct');
          console.error(
            '   - Check that the packages exist in your organization',
          );
          console.error('   - Ensure you have the correct API key configured');
        }
      } else {
        console.error(`   ${String(error)}`);
      }

      process.exit(1);
    }
  },
});
