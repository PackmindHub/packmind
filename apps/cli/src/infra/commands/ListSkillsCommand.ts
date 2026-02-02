import { command } from 'cmd-ts';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { listSkillsHandler } from './listSkillsHandler';

export const listSkillsCommand = command({
  name: 'list',
  description: 'List available skills',
  args: {},
  handler: async () => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await listSkillsHandler({
      packmindCliHexa,
      exit: process.exit,
      log: console.log,
      error: console.error,
    });
  },
});
