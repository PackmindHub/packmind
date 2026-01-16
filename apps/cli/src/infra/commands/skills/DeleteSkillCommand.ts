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

export const deleteSkillCommand = command({
  name: 'delete',
  description: 'Delete a skill from local agent directories',
  args: {
    skillName: positional({
      type: string,
      displayName: 'skill-name',
      description: 'Name of the skill to delete (e.g., "signal-capture")',
    }),
    agent: option({
      type: optional(AgentTypeArg),
      long: 'agent',
      short: 'a',
      description:
        'Target specific agent type (claude, github). If not specified, deletes from all agents.',
    }),
  },
  handler: async ({ skillName, agent }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    try {
      const baseDirectory = process.cwd();
      const agents = agent ? [agent] : undefined;

      logInfoConsole(`Deleting skill "${skillName}"...`);

      const result = await packmindCliHexa.deleteLocalSkill({
        baseDirectory,
        skillName,
        agents,
      });

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          logErrorConsole(error);
        }
        process.exit(1);
      }

      if (result.deletedPaths.length === 0) {
        logWarningConsole(
          `Skill "${skillName}" was not found in any location:`,
        );
        for (const notFoundPath of result.notFoundPaths) {
          logInfoConsole(`  - ${notFoundPath}`);
        }
        process.exit(0);
      }

      logSuccessConsole(`Skill "${skillName}" deleted successfully!`);
      for (const deletedPath of result.deletedPaths) {
        logInfoConsole(`  - ${deletedPath}`);
      }

      if (result.notFoundPaths.length > 0) {
        logInfoConsole('\nNot found in:');
        for (const notFoundPath of result.notFoundPaths) {
          logInfoConsole(`  - ${notFoundPath}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logErrorConsole(`Delete failed: ${error.message}`);
      } else {
        logErrorConsole(`Delete failed: ${String(error)}`);
      }
      process.exit(1);
    }
  },
});
