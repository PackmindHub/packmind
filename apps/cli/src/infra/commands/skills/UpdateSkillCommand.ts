import { command, string, positional, option, optional, Type } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logWarningConsole,
} from '../../utils/consoleLogger';
import { AgentType, ALL_AGENTS } from '../../../domain/constants/AgentPaths';

const AgentTypeArg: Type<string, AgentType> = {
  async from(input) {
    if (input === 'claude' || input === 'github') {
      return input;
    }
    throw new Error(
      `Invalid agent type "${input}". Valid values are: ${ALL_AGENTS.join(', ')}`,
    );
  },
};

export const updateSkillCommand = command({
  name: 'update',
  description: 'Update a skill in local agent directories from a source path',
  args: {
    skillName: positional({
      type: string,
      displayName: 'skill-name',
      description: 'Name of the skill to update (e.g., "signal-capture")',
    }),
    source: option({
      type: string,
      long: 'source',
      short: 's',
      description: 'Path to skill directory with updated files',
    }),
    agent: option({
      type: optional(AgentTypeArg),
      long: 'agent',
      short: 'a',
      description:
        'Target specific agent type (claude, github). If not specified, updates in all agents where skill exists.',
    }),
  },
  handler: async ({ skillName, source, agent }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      const baseDirectory = process.cwd();
      const agents = agent ? [agent] : undefined;

      logInfoConsole(`Updating skill "${skillName}" from ${source}...`);

      const result = await packmindCliHexa.updateLocalSkill({
        baseDirectory,
        skillName,
        sourcePath: source,
        agents,
      });

      if (result.skippedAsUserCreated) {
        logWarningConsole(
          `Skill "${skillName}" is not managed by Packmind. Skipping.`,
        );
        logInfoConsole(
          `Only skills installed via Packmind packages can be updated with this command.`,
        );
        process.exit(0);
      }

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          logErrorConsole(error);
        }
        process.exit(1);
      }

      if (result.updatedPaths.length === 0) {
        logWarningConsole(
          `Skill "${skillName}" was not found in any location:`,
        );
        for (const notFoundPath of result.notFoundPaths) {
          logInfoConsole(`  - ${notFoundPath}`);
        }
        process.exit(0);
      }

      logSuccessConsole(`Skill "${skillName}" updated successfully!`);
      logInfoConsole(`  Files created: ${result.filesCreated}`);
      logInfoConsole(`  Files updated: ${result.filesUpdated}`);
      logInfoConsole(`  Files deleted: ${result.filesDeleted}`);
      logInfoConsole('\nUpdated in:');
      for (const updatedPath of result.updatedPaths) {
        logInfoConsole(`  - ${updatedPath}`);
      }

      if (result.notFoundPaths.length > 0) {
        logInfoConsole('\nNot found in:');
        for (const notFoundPath of result.notFoundPaths) {
          logInfoConsole(`  - ${notFoundPath}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(`Update failed: ${error.message}`);
      } else {
        logErrorConsole(`Update failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
