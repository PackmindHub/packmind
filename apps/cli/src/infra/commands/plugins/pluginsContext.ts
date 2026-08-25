import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type PluginMode = 'marketplace' | 'standalone' | 'none';

export type PluginVendor = 'claude' | 'copilot';

export type PluginContext = {
  mode: PluginMode;
  vendor?: PluginVendor;
  manifestPath?: string;
};

/**
 * Detects which local plugin descriptor (if any) governs this directory.
 *
 * Candidates are probed in a fixed, deliberate order and the first match
 * wins — never content-sniffed. This mirrors the backend's
 * `MARKETPLACE_DESCRIPTOR_PATHS` pattern: a repo's marketplace config
 * targets either GitHub Copilot or Claude Code, never both. If somehow
 * multiple candidate files exist, the earlier entry in this ordered list
 * wins:
 *
 *   1. `.claude-plugin/marketplace.json` -> marketplace mode, claude vendor
 *   2. `.github/plugin/marketplace.json` -> marketplace mode, copilot vendor
 *   3. `.claude-plugin/plugin.json`      -> standalone mode, claude vendor
 *      (standalone mode is Claude-only; there is no Copilot equivalent)
 *   4. none of the above                 -> `{ mode: 'none' }`
 */
export function detectPluginMode(cwd: string): PluginContext {
  const claudeMarketplace = join(cwd, '.claude-plugin/marketplace.json');
  const copilotMarketplace = join(cwd, '.github/plugin/marketplace.json');
  const standalone = join(cwd, '.claude-plugin/plugin.json');
  if (existsSync(claudeMarketplace)) {
    return {
      mode: 'marketplace',
      vendor: 'claude',
      manifestPath: claudeMarketplace,
    };
  }
  if (existsSync(copilotMarketplace)) {
    return {
      mode: 'marketplace',
      vendor: 'copilot',
      manifestPath: copilotMarketplace,
    };
  }
  if (existsSync(standalone)) {
    return { mode: 'standalone', vendor: 'claude', manifestPath: standalone };
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
  // A file saved with a UTF-8 byte-order mark (U+FEFF) is still valid JSON,
  // but JSON.parse rejects the leading BOM outright. Strip it — and only a
  // BOM at position 0 — before parsing.
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const parsed = JSON.parse(content) as Marketplace;
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
