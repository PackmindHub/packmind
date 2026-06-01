import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { RenderedPluginFile } from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  detectPluginMode,
  readMarketplace,
  writeMarketplace,
  findPluginEntry,
  upsertPluginEntry,
  classifySource,
} from './pluginsContext';
import { resolveGitContext } from './resolveGitContext';

export type RenderPluginArgs = {
  packageSlug: string;
};

export type RenderPluginHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: (message: string) => void;
  error: (message: string) => void;
  confirmOverwrite: (message: string) => Promise<boolean>;
};

export async function renderPluginHandler(
  args: RenderPluginArgs,
  deps: RenderPluginHandlerDependencies,
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

  const pluginName = pluginNameFromSlug(args.packageSlug);
  const { gitRemoteUrl, gitBranch } = await resolveGitContext(
    deps.packmindCliHexa,
    cwd,
  );

  if (ctx.mode === 'marketplace') {
    const manifestPath = ctx.manifestPath as string;
    const marketplace = readMarketplace(manifestPath);
    const existing = findPluginEntry(marketplace, pluginName);

    if (existing) {
      if (classifySource(existing.source) === 'remote') {
        deps.error(
          `Plugin "${pluginName}" has a remote source. Run this command in the workspace of the remote plugin.`,
        );
        deps.exit(1);
        return;
      }

      const existingLocalSource = existing.source as string;
      const confirmed = await deps.confirmOverwrite(
        `Plugin "${pluginName}" already exists at "${existingLocalSource}". Overwrite? [y/N] `,
      );
      if (!confirmed) {
        deps.log('No changes made.');
        deps.exit(0);
        return;
      }

      const existingPluginRoot = existingLocalSource
        .replace(/^\.\//, '')
        .replace(/\/?$/, '/');
      const response = await deps.packmindCliHexa.renderPlugin({
        packageSlug: args.packageSlug,
        mode: 'marketplace',
        pluginRoot: existingPluginRoot,
        pluginName,
        gitRemoteUrl,
        gitBranch,
      });

      writeFiles(cwd, response.files);

      const nextEntry: typeof existing = {
        name: existing.name,
        source: existing.source,
        ...(response.pluginDescription
          ? { description: response.pluginDescription }
          : {}),
      };
      writeMarketplace(manifestPath, upsertPluginEntry(marketplace, nextEntry));

      deps.log(
        `Re-rendered ${response.files.length} files into ${existingLocalSource}`,
      );
      reportSkippedStandards(deps, response.skippedStandardsCount);
      deps.exit(0);
      return;
    }

    const pluginRoot = `plugins/${pluginName}/`;
    const response = await deps.packmindCliHexa.renderPlugin({
      packageSlug: args.packageSlug,
      mode: 'marketplace',
      pluginRoot,
      pluginName,
      gitRemoteUrl,
      gitBranch,
    });

    writeFiles(cwd, response.files);

    const updated = upsertPluginEntry(marketplace, {
      name: pluginName,
      source: `./${pluginRoot.replace(/\/$/, '')}`,
      description: response.pluginDescription,
    });
    writeMarketplace(manifestPath, updated);

    deps.log(`Rendered ${response.files.length} files into ./${pluginRoot}`);
    reportSkippedStandards(deps, response.skippedStandardsCount);
    deps.log('Updated .claude-plugin/marketplace.json');
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
      `Plugin "${pluginName}" already exists in this workspace. Overwrite? [y/N] `,
    );
    if (!confirmed) {
      deps.log('No changes made.');
      deps.exit(0);
      return;
    }

    const response = await deps.packmindCliHexa.renderPlugin({
      packageSlug: args.packageSlug,
      mode: 'standalone',
      pluginRoot: '/',
      pluginName,
      gitRemoteUrl,
      gitBranch,
    });

    writeFiles(cwd, response.files);

    deps.log(`Re-rendered ${response.files.length} files into ./`);
    reportSkippedStandards(deps, response.skippedStandardsCount);
    deps.exit(0);
    return;
  }
}

function pluginNameFromSlug(packageSlug: string): string {
  return packageSlug.split('/').pop() as string;
}

function reportSkippedStandards(
  deps: RenderPluginHandlerDependencies,
  skippedStandardsCount: number,
): void {
  if (skippedStandardsCount > 0) {
    deps.log(
      `Skipped ${skippedStandardsCount} standards (not supported in Claude plugins).`,
    );
  }
}

function writeFiles(cwd: string, files: RenderedPluginFile[]): void {
  for (const file of files) {
    const absolutePath = join(cwd, file.path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content);
  }
}
