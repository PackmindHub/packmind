import { command, option, string, optional, boolean, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
  logWarningConsole,
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
    dryRun: flag({
      type: boolean,
      long: 'dry-run',
      short: 'd',
      description: 'Preview generated content without writing files',
    }),
  },
  handler: async ({ path: projectPath, dryRun }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const targetPath = projectPath || process.cwd();

    try {
      logConsole('\n');
      logInfoConsole('Scanning project...');

      const result = await packmindCliHexa.aggressiveOnboarding({
        projectPath: targetPath,
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
        return;
      }

      // Write content to files unless dry-run
      if (dryRun) {
        logInfoConsole(`Dry run: ${totalItems} items would be created`);
        logConsole('\nRun without --dry-run to write files to disk.');
      } else {
        logConsole('\n');
        logInfoConsole('Writing generated content to files...');

        const writeResult = await packmindCliHexa.writeContent(
          targetPath,
          result.content,
        );

        if (writeResult.errors.length > 0) {
          for (const error of writeResult.errors) {
            logWarningConsole(error);
          }
        }

        logConsole('\n');
        logSuccessConsole(`Created ${writeResult.filesCreated} files:`);

        // Show created file paths
        if (writeResult.paths.standards.length > 0) {
          logConsole('\n  Standards:');
          for (const filePath of writeResult.paths.standards) {
            logConsole(`    - ${filePath}`);
          }
        }

        if (writeResult.paths.commands.length > 0) {
          logConsole('\n  Commands:');
          for (const filePath of writeResult.paths.commands) {
            logConsole(`    - ${filePath}`);
          }
        }

        if (writeResult.paths.skills.length > 0) {
          logConsole('\n  Skills:');
          for (const filePath of writeResult.paths.skills) {
            logConsole(`    - ${filePath}`);
          }
        }

        logConsole('\n');
        logSuccessConsole('Onboarding complete!');
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
