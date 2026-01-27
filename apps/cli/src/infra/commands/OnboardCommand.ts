import { command, option, string, optional } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
} from '../utils/consoleLogger';

export const onboardCommand = command({
  name: 'onboard',
  description:
    'Scan your project and generate standards, commands, and skills based on detected patterns',
  args: {
    path: option({
      type: optional(string),
      long: 'path',
      short: 'p',
      description: 'Project path to scan (defaults to current directory)',
    }),
  },
  handler: async ({ path: projectPath }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      logConsole('\n');
      logInfoConsole('Scanning project...');

      const result = await packmindCliHexa.aggressiveOnboarding({
        projectPath: projectPath || process.cwd(),
      });

      // Display scan results
      logConsole('\n');
      logSuccessConsole('Project scan complete!');
      logConsole('\n');

      // Show detected technologies
      logConsole('Detected:');
      if (result.scanResult.languages.length > 0) {
        logConsole(`  Languages: ${result.scanResult.languages.join(', ')}`);
      }
      if (result.scanResult.frameworks.length > 0) {
        logConsole(`  Frameworks: ${result.scanResult.frameworks.join(', ')}`);
      }
      if (result.scanResult.tools.length > 0) {
        logConsole(`  Tools: ${result.scanResult.tools.join(', ')}`);
      }
      if (result.scanResult.testFramework) {
        logConsole(`  Test Framework: ${result.scanResult.testFramework}`);
      }
      if (result.scanResult.packageManager) {
        logConsole(`  Package Manager: ${result.scanResult.packageManager}`);
      }
      if (result.scanResult.structure.isMonorepo) {
        logConsole('  Structure: Monorepo');
      }

      // Display generated content preview
      logConsole(result.preview);

      // Summary
      const totalItems =
        result.content.standards.length +
        result.content.commands.length +
        result.content.skills.length;

      if (totalItems === 0) {
        logInfoConsole(
          'No content was generated. Your project may not have detectable patterns.',
        );
        logConsole(
          '\nTip: Add a CLAUDE.md, CONTRIBUTING.md, or similar documentation files to help generate more relevant content.',
        );
      } else {
        logSuccessConsole(
          `Generated ${totalItems} items ready to push to Packmind`,
        );
        logConsole('\n');
        logInfoConsole(
          'To push this content to your Packmind space, use: packmind install <package> --auto-onboard',
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(error.message);
      } else {
        logErrorConsole(String(error));
      }
      process.exit(1);
    }
  },
});
