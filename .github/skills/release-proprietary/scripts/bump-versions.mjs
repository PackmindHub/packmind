#!/usr/bin/env node
// Bump version field in package.json and apps/api/docker-package.json to the
// provided version. Preserves 2-space indentation and trailing newline.
//
// Usage: node bump-versions.mjs <version> <repo-dir>

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , version, repoDirArg] = process.argv;

if (!version || !repoDirArg) {
  console.error('usage: bump-versions.mjs <version> <repo-dir>');
  process.exit(1);
}

const repoDir = resolve(repoDirArg);
const targets = ['package.json', 'apps/api/docker-package.json'];

for (const rel of targets) {
  const path = join(repoDir, rel);
  const raw = readFileSync(path, 'utf8');
  const json = JSON.parse(raw);
  const previous = json.version;
  json.version = version;
  const endsWithNewline = raw.endsWith('\n');
  writeFileSync(path, JSON.stringify(json, null, 2) + (endsWithNewline ? '\n' : ''));
  console.log(`bumped ${rel}: ${previous} → ${version}`);
}
