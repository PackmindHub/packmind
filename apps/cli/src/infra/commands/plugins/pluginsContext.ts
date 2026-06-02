import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type PluginMode = 'marketplace' | 'standalone' | 'none';

export type PluginContext = {
  mode: PluginMode;
  manifestPath?: string;
};

export function detectPluginMode(cwd: string): PluginContext {
  const marketplace = join(cwd, '.claude-plugin/marketplace.json');
  const standalone = join(cwd, '.claude-plugin/plugin.json');
  if (existsSync(marketplace)) {
    return { mode: 'marketplace', manifestPath: marketplace };
  }
  if (existsSync(standalone)) {
    return { mode: 'standalone', manifestPath: standalone };
  }
  return { mode: 'none' };
}

export type RemoteSourceObject = {
  source: 'github' | 'url' | 'git-subdir' | 'npm';
  [key: string]: unknown;
};

export type MarketplaceEntry = {
  name: string;
  source: string | RemoteSourceObject;
  description?: string;
};

export type SourceKind = 'local' | 'remote';

export type Marketplace = {
  plugins: MarketplaceEntry[];
  [key: string]: unknown;
};

export function readMarketplace(path: string): Marketplace {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as Marketplace;
  return { ...parsed, plugins: parsed.plugins ?? [] };
}

export function writeMarketplace(path: string, content: Marketplace): void {
  writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`);
}

export function classifySource(source: MarketplaceEntry['source']): SourceKind {
  if (
    typeof source === 'string' &&
    (source.startsWith('./') || source.startsWith('/'))
  ) {
    return 'local';
  }
  return 'remote';
}

export function findPluginEntry(
  marketplace: Marketplace,
  name: string,
): MarketplaceEntry | undefined {
  return marketplace.plugins.find((plugin) => plugin.name === name);
}

export function upsertPluginEntry(
  marketplace: Marketplace,
  entry: MarketplaceEntry,
): Marketplace {
  const exists = marketplace.plugins.some(
    (plugin) => plugin.name === entry.name,
  );
  const plugins = exists
    ? marketplace.plugins.map((plugin) =>
        plugin.name === entry.name ? entry : plugin,
      )
    : [...marketplace.plugins, entry];
  return { ...marketplace, plugins };
}

export function removePluginEntry(
  marketplace: Marketplace,
  name: string,
): Marketplace {
  return {
    ...marketplace,
    plugins: marketplace.plugins.filter((plugin) => plugin.name !== name),
  };
}
