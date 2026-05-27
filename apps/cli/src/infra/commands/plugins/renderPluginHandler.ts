import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { RenderedPluginFile } from '@packmind/types';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  detectPluginMode,
  readMarketplace,
  writeMarketplace,
  findPluginEntry,
  upsertPluginEntry,
  isRemoteSource,
} from './pluginsContext';

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

  if (ctx.mode === 'marketplace') {
    const manifestPath = ctx.manifestPath as string;
    const marketplace = readMarketplace(manifestPath);
    const existing = findPluginEntry(marketplace, pluginName);

    if (existing) {
      if (!isRemoteSource(existing.source)) {
        const confirmed = await deps.confirmOverwrite(
          `Plugin "${pluginName}" already exists at "${existing.source}". Overwrite? [y/N] `,
        );
        if (!confirmed) {
          deps.log('No changes made.');
          deps.exit(0);
          return;
        }

        const existingPluginRoot = existing.source
          .replace(/^\.?\//, '')
          .replace(/\/?$/, '/');
        const response = await deps.packmindCliHexa.renderPlugin({
          packageSlug: args.packageSlug,
          mode: 'marketplace',
          pluginRoot: existingPluginRoot,
          pluginName,
        });

        writeFiles(cwd, response.files);

        if (
          response.pluginDescription &&
          response.pluginDescription !== existing.description
        ) {
          writeMarketplace(
            manifestPath,
            upsertPluginEntry(marketplace, {
              ...existing,
              description: response.pluginDescription,
            }),
          );
        }

        deps.log(
          `Re-rendered ${response.files.length} files into ${existing.source}`,
        );
        reportSkippedStandards(deps, response.skippedStandardsCount);
        deps.exit(0);
        return;
      }
    }

    const pluginRoot = `plugins/${pluginName}/`;
    const response = await deps.packmindCliHexa.renderPlugin({
      packageSlug: args.packageSlug,
      mode: 'marketplace',
      pluginRoot,
      pluginName,
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
