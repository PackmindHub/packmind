import { existsSync } from 'fs';
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
