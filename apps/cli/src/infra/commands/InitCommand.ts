import { command, flag } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { AgentInstructionsService } from '../../application/services/AgentInstructionsService';
import { promptConfirmation } from '../utils/promptUtils';

export const initCommand = command({
  name: 'init',
  description:
    'Initialize Packmind in your project: install default skills and generate project-specific standards/commands/skills',
  args: {
    skipOnboard: flag({
      long: 'skip-onboard',
      description: 'Skip the automatic project scanning and content generation',
    }),
    skipDefaultSkills: flag({
      long: 'skip-default-skills',
      description: 'Skip installing default Packmind skills',
    }),
    dryRun: flag({
      long: 'dry-run',
      short: 'd',
      description: 'Preview generated content without writing files',
    }),
    yes: flag({
      long: 'yes',
      short: 'y',
      description: 'Skip confirmation prompts and proceed automatically',
    }),
    push: flag({
      long: 'push',
      description: 'Push generated standards and commands to Packmind backend',
    }),
  },
  handler: async ({ skipOnboard, skipDefaultSkills, dryRun, yes, push }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);
    const targetPath = process.cwd();

    logConsole('\n');
    logInfoConsole('Initializing Packmind...');

    try {
      // Step 1: Install default skills (unless skipped)
      if (!skipDefaultSkills) {
        logConsole('\n');
        logInfoConsole('Installing default skills...');

        const skillsResult = await packmindCliHexa.installDefaultSkills({});

        if (skillsResult.errors.length > 0) {
          for (const error of skillsResult.errors) {
            logWarningConsole(`Error: ${error}`);
          }
        }

        const totalSkillFiles =
          skillsResult.filesCreated + skillsResult.filesUpdated;

        if (totalSkillFiles === 0 && skillsResult.errors.length === 0) {
          logInfoConsole('Default skills are already up to date.');
        } else if (totalSkillFiles > 0) {
          logSuccessConsole(
            `Default skills: added ${skillsResult.filesCreated} files, changed ${skillsResult.filesUpdated} files`,
          );
        }
      }

      // Step 2: Run auto-onboarding (unless skipped)
      if (!skipOnboard) {
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
          logConsole(
            `  Frameworks: ${result.scanResult.frameworks.join(', ')}`,
          );
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
        } else if (dryRun) {
          logInfoConsole(`Dry run: ${totalItems} items would be created`);
          logConsole('\nRun without --dry-run to write files to disk.');
        } else {
          // Prompt for confirmation unless --yes flag is set
          const shouldWrite =
            yes ||
            (await promptConfirmation(
              `\nWrite ${totalItems} generated files to disk?`,
            ));

          if (!shouldWrite) {
            logInfoConsole('Skipped writing files.');
            logConsole(
              'Run with --dry-run to preview, or --yes to auto-approve.',
            );
          } else {
            // Write content to files
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

            // Write enhancement instructions to all agent config files
            const instructionsService = new AgentInstructionsService();
            const instructionsResult =
              await instructionsService.writeToAllAgentConfigs(
                targetPath,
                writeResult,
                result.scanResult,
              );

            // Show agent config files that were updated
            if (
              instructionsResult.filesCreated.length > 0 ||
              instructionsResult.filesUpdated.length > 0
            ) {
              logConsole('\n');
              logInfoConsole('Enhancement instructions added to:');

              for (const file of instructionsResult.filesCreated) {
                logConsole(`    + ${file} (created)`);
              }
              for (const file of instructionsResult.filesUpdated) {
                logConsole(`    ~ ${file} (updated)`);
              }

              logConsole('\n');
              logConsole(
                'Your AI agent will automatically see these instructions and enhance the generated files.',
              );
            }

            if (instructionsResult.errors.length > 0) {
              for (const error of instructionsResult.errors) {
                logWarningConsole(error);
              }
            }

            // Push to backend if requested
            if (push) {
              logConsole('\n');
              logInfoConsole('Pushing content to Packmind backend...');

              const pushResult = await packmindCliHexa.pushContent(
                result.content.standards,
                result.content.commands,
              );

              if (pushResult.errors.length > 0) {
                for (const error of pushResult.errors) {
                  logWarningConsole(error);
                }
              }

              if (
                pushResult.standardsCreated > 0 ||
                pushResult.commandsCreated > 0
              ) {
                logConsole('\n');
                logSuccessConsole(
                  `Pushed to backend: ${pushResult.standardsCreated} standards, ${pushResult.commandsCreated} commands`,
                );

                if (pushResult.createdStandards.length > 0) {
                  logConsole('\n  Standards:');
                  for (const standard of pushResult.createdStandards) {
                    logConsole(`    - ${standard.name} (ID: ${standard.id})`);
                  }
                }

                if (pushResult.createdCommands.length > 0) {
                  logConsole('\n  Commands:');
                  for (const cmd of pushResult.createdCommands) {
                    logConsole(`    - ${cmd.name} (slug: ${cmd.slug})`);
                  }
                }
              }
            }
          }
        }
      }

      logConsole('\n');
      logSuccessConsole('Packmind initialization complete!');
      logConsole('\n');
      logConsole('Next steps:');
      logConsole(
        '  - Review generated files in .packmind/ and .claude/skills/',
      );
      logConsole('  - Install packages: packmind-cli install <package-slug>');
      logConsole('  - Setup MCP integration: packmind-cli setup-mcp');
      logConsole('\n');
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
