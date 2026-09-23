#!/usr/bin/env node
// Mutate CHANGELOG.MD for the next development cycle:
//   - Prepend a fresh `# [Unreleased]` section with empty Added/Changed/Fixed/Removed
//   - Insert `[Unreleased]: ...compare/release/{version}...HEAD` link just above
//     the `[{version}]: ...` link in the bottom link section
//
// Usage: node changelog-next.mjs <version> <repo-dir>

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , version, repoDirArg] = process.argv;

if (!version || !repoDirArg) {
  console.error('usage: changelog-next.mjs <version> <repo-dir>');
  process.exit(1);
}

const path = join(resolve(repoDirArg), 'CHANGELOG.MD');
const original = readFileSync(path, 'utf8');

const firstHeadingMatch = original.match(/^# \[/m);
if (!firstHeadingMatch) {
  console.error('CHANGELOG.MD: could not find any `# [` heading');
  process.exit(1);
}
const insertAt = firstHeadingMatch.index;

const unreleasedBlock =
  '# [Unreleased]\n\n## Added\n\n## Changed\n\n## Fixed\n\n## Removed\n\n';

let result = original.slice(0, insertAt) + unreleasedBlock + original.slice(insertAt);

const versionLinkRegex = new RegExp(
  `^\\[${version.replace(/\./g, '\\.')}\\]: (https://github\\.com/[^/]+/[^/]+)/compare/release/[0-9A-Za-z._-]+\\.\\.\\.release/${version.replace(/\./g, '\\.')}\\s*$`,
  'm',
);
const versionLinkMatch = result.match(versionLinkRegex);
if (!versionLinkMatch) {
  console.error(`CHANGELOG.MD: could not find \`[${version}]: ...\` compare link`);
  process.exit(1);
}
const repoUrl = versionLinkMatch[1];
const unreleasedLink = `[Unreleased]: ${repoUrl}/compare/release/${version}...HEAD`;

result = result.replace(versionLinkRegex, `${unreleasedLink}\n${versionLinkMatch[0]}`);

writeFileSync(path, result);
console.log(`changelog: prepared next cycle after ${version}`);
