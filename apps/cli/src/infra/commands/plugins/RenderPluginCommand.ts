import { command, positional } from 'cmd-ts';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { renderPluginHandler } from './renderPluginHandler';
import { confirmOverwrite } from './confirmOverwrite';
import { PackageSlugArgType } from '../customParameters/PackageSlugArgType';

export const renderPluginCommand = command({
  name: 'render',
  description: 'Render a Packmind package as a Claude plugin',
  args: {
    packageSlug: positional({
      type: PackageSlugArgType,
      displayName: 'package-slug',
      description: 'Package slug (e.g. security or @my-space/security)',
    }),
  },
  handler: async ({ packageSlug }) => {
    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    await renderPluginHandler(
      { packageSlug },
      {
        packmindCliHexa,
        exit: process.exit,
        getCwd: () => process.cwd(),
        log: console.log,
        error: console.error,
        confirmOverwrite,
      },
    );
  },
});
