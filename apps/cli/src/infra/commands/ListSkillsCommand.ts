import { command, option, optional, string } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listSkillsHandler } from './skills/listSkillsHandler';

export const listSkillsCommand = command({
  name: 'list',
  description: 'List available skills',
  args: {
    space: option({
      type: optional(string),
      long: 'space',
      description: 'Filter skills by space slug',
    }),
  },
  handler: async ({ space }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listSkillsHandler(
      { space },
      {
        packmindCliHexa,
        exit: process.exit,
      },
    );
  },
});
