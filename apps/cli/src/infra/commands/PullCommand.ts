import { command, restPositionals, string, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export const pullCommand = command({
  name: 'pull',
  description:
    'Pull recipes and standards from specified packages and save them to the current directory',
  args: {
    list: flag({
      long: 'list',
      description: 'List available packages',
    }),
    packagesSlugs: restPositionals({
      type: string,
      displayName: 'packages',
      description:
        'Package slugs to pull content from (e.g., backend frontend)',
    }),
  },
  handler: async ({ list, packagesSlugs }) => {
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

    // Show help if no package slugs provided
    if (packagesSlugs.length === 0) {
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

    console.log(
      `Pulling content from packages: ${packagesSlugs.join(', ')}...`,
    );

    try {
      // Execute the pull operation
      const result = await packmindCliHexa.pullData({
        baseDirectory: process.cwd(),
        packagesSlugs,
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
