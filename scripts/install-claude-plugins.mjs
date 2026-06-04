#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.resolve(__dirname, '..', '.claude', 'settings.json');

const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
const settings = JSON.parse(raw);

const enabled = Object.entries(settings.enabledPlugins ?? {})
  .filter(([, on]) => on)
  .map(([id]) => id);

if (enabled.length === 0) {
  console.log(
    'No enabled plugins found in .claude/settings.json — nothing to install.',
  );
  process.exit(0);
}

const claudeCheck = spawnSync('claude', ['--version'], { stdio: 'ignore' });
if (claudeCheck.status !== 0) {
  console.error(
    'Error: `claude` CLI not found on PATH. Install Claude Code first.',
  );
  process.exit(1);
}

let failures = 0;
for (const id of enabled) {
  console.log(`\n→ Installing ${id}`);
  try {
    execFileSync('claude', ['plugin', 'install', id], { stdio: 'inherit' });
  } catch {
    failures += 1;
    console.error(`✗ Failed to install ${id}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} plugin(s) failed to install.`);
  process.exit(1);
}
console.log('\nAll enabled plugins installed.');
