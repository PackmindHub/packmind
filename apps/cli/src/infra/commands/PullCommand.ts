import { command, restPositionals, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export const pullCommand = command({
  name: 'pull',
  description:
    'Pull recipes and standards from specified packages and save them to the current directory',
  args: {
    packagesSlugs: restPositionals({
      type: string,
      displayName: 'packages',
      description:
        'Package slugs to pull content from (e.g., backend frontend)',
    }),
  },
  handler: async ({ packagesSlugs }) => {
    // Show help if no package slugs provided
    if (packagesSlugs.length === 0) {
      console.log('Usage: packmind-cli pull <package-slug> [package-slug...]');
      console.log('');
      console.log('Examples:');
      console.log('  packmind-cli pull backend');
      console.log('  packmind-cli pull backend frontend');
      console.log('');
      console.log('Pull recipes and standards from the specified packages.');
      process.exit(0);
    }

    console.log(
      `Pulling content from packages: ${packagesSlugs.join(', ')}...`,
    );

    // Initialize hexa and logger
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

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
        console.error(`   ${error.message}`);

        // Check if it's an API error with additional details
        const errorObj = error as Error & {
          response?: { data?: { message?: string } };
        };
        if (errorObj.response?.data?.message) {
          console.error(`\n   Details: ${errorObj.response.data.message}`);
        }
      } else {
        console.error(`   ${String(error)}`);
      }

      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Verify that the package slugs are correct');
      console.error('   - Check that the packages exist in your organization');
      console.error('   - Ensure you have the correct API key configured');

      process.exit(1);
    }
  },
});
