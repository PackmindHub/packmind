import { rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  detectPluginMode,
  readMarketplace,
  writeMarketplace,
  findPluginEntry,
  removePluginEntry,
  classifySource,
} from './pluginsContext';
import { resolveGitContext } from './resolveGitContext';
import { logWarningConsole } from '../../utils/consoleLogger';

export type DeletePluginArgs = {
  packageSlug: string;
};

export type DeletePluginHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: (message: string) => void;
  error: (message: string) => void;
  confirmOverwrite: (message: string) => Promise<boolean>;
};

export async function deletePluginHandler(
  args: DeletePluginArgs,
  deps: DeletePluginHandlerDependencies,
): Promise<void> {
  const cwd = deps.getCwd();
  const ctx = detectPluginMode(cwd);

  if (ctx.mode === 'none') {
    deps.error(
      'No .claude-plugin/marketplace.json or .claude-plugin/plugin.json found in this directory.',
    );
    deps.exit(1);
    return;
  }

  const pluginName = args.packageSlug.split('/').pop() as string;
  const { gitRemoteUrl } = await resolveGitContext(deps.packmindCliHexa, cwd);

  if (ctx.mode === 'marketplace') {
    const manifestPath = ctx.manifestPath as string;
    const marketplace = readMarketplace(manifestPath);
    const entry = findPluginEntry(marketplace, pluginName);

    if (!entry) {
      deps.log(
        `Plugin "${pluginName}" is not declared in marketplace.json. Nothing to delete.`,
      );
      deps.exit(0);
      return;
    }

    if (classifySource(entry.source) === 'remote') {
      deps.error(
        `Plugin "${pluginName}" has a remote source. Run this command in the workspace of the remote plugin.`,
      );
      deps.exit(1);
      return;
    }

    const localSource = entry.source as string;
    const confirmed = await deps.confirmOverwrite(
      `Remove ${localSource} and update marketplace.json for plugin "${pluginName}"? [y/N] `,
    );
    if (!confirmed) {
      deps.log('No changes made.');
      deps.exit(0);
      return;
    }

    rmSync(join(cwd, localSource), { recursive: true, force: true });
    writeMarketplace(manifestPath, removePluginEntry(marketplace, pluginName));
    deps.log(`Removed ${localSource} and updated marketplace.json`);
    await trackDeletion(deps, args.packageSlug, gitRemoteUrl);
    deps.exit(0);
    return;
  }

  if (ctx.mode === 'standalone') {
    const manifestPath = ctx.manifestPath as string;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name?: string;
    };

    if (manifest.name !== pluginName) {
      deps.error(`The plugin '${pluginName}' is not handled in this repo.`);
      deps.exit(1);
      return;
    }

    const confirmed = await deps.confirmOverwrite(
      `Remove rendered files for plugin "${pluginName}" from this workspace? [y/N] `,
    );
    if (!confirmed) {
      deps.log('No changes made.');
      deps.exit(0);
      return;
    }

    rmSync(join(cwd, 'commands'), { recursive: true, force: true });
    rmSync(join(cwd, 'skills'), { recursive: true, force: true });
    deps.log(`Removed rendered files for "${pluginName}"`);
    await trackDeletion(deps, args.packageSlug, gitRemoteUrl);
    deps.exit(0);
    return;
  }
}

async function trackDeletion(
  deps: DeletePluginHandlerDependencies,
  packageSlug: string,
  gitRemoteUrl: string,
): Promise<void> {
  try {
    await deps.packmindCliHexa.trackPluginDeleted({
      packageSlug,
      gitRemoteUrl,
    });
  } catch {
    logWarningConsole('Failed to notify Packmind of plugin deletion');
  }
}
