import { rmSync } from 'fs';
import { join } from 'path';
import {
  detectPluginMode,
  readMarketplace,
  writeMarketplace,
  findPluginEntry,
  removePluginEntry,
  isRemoteSource,
} from './pluginsContext';

export type DeletePluginArgs = {
  packageSlug: string;
};

export type DeletePluginHandlerDependencies = {
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

    if (isRemoteSource(entry.source)) {
      deps.error(
        `Plugin "${pluginName}" has a remote source. Run this command in the workspace of the remote plugin.`,
      );
      deps.exit(1);
      return;
    }

    rmSync(join(cwd, entry.source), { recursive: true, force: true });
    writeMarketplace(manifestPath, removePluginEntry(marketplace, pluginName));
    deps.log(`Removed ${entry.source} and updated marketplace.json`);
    deps.exit(0);
    return;
  }
}
