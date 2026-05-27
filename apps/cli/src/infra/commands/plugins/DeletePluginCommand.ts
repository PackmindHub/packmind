import { command, positional, string } from 'cmd-ts';
import { deletePluginHandler } from './deletePluginHandler';
import { confirmOverwrite } from './confirmOverwrite';

export const deletePluginCommand = command({
  name: 'delete',
  description: 'Delete a rendered Packmind plugin from this workspace',
  args: {
    packageSlug: positional({
      type: string,
      displayName: 'package-slug',
      description: 'Package slug (e.g. security or @my-space/security)',
    }),
  },
  handler: async ({ packageSlug }) => {
    await deletePluginHandler(
      { packageSlug },
      {
        exit: process.exit,
        getCwd: () => process.cwd(),
        log: console.log,
        error: console.error,
        confirmOverwrite,
      },
    );
  },
});
