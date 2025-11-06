import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';

export const pullCommand = command({
  name: 'pull',
  description:
    'Pull recipes and standards from Packmind and save them to the current directory',
  args: {},
  handler: async () => {
    console.log('Pulling content from Packmind...');

    // Initialize hexa and logger
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      // Execute the pull operation
      const result = await packmindCliHexa.pullData({
        baseDirectory: process.cwd(),
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
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  },
});
