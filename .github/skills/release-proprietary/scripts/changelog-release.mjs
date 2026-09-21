#!/usr/bin/env node
// Mutate CHANGELOG.MD for a release:
//   - Rename `# [Unreleased]` heading to `# [{version}] - {date}`
//   - Drop empty `## Added|Changed|Fixed|Removed` subsections inside that block
//   - Swap the bottom compare link
//       `[Unreleased]: ...compare/release/{prev}...HEAD`
//     for
//       `[{version}]: ...compare/release/{prev}...release/{version}`
//
// Usage: node changelog-release.mjs <version> <date> <repo-dir>

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [, , version, date, repoDirArg] = process.argv;

if (!version || !date || !repoDirArg) {
  console.error('usage: changelog-release.mjs <version> <date> <repo-dir>');
  process.exit(1);
}

const path = join(resolve(repoDirArg), 'CHANGELOG.MD');
const original = readFileSync(path, 'utf8');

const unreleasedHeading = original.match(/^# \[Unreleased\][^\n]*$/m);
if (!unreleasedHeading) {
  console.error('CHANGELOG.MD: could not find `# [Unreleased]` heading');
  process.exit(1);
}

const start = unreleasedHeading.index;
const after = original.slice(start + unreleasedHeading[0].length);
const nextHeadingRel = after.match(/^# \[/m);
if (!nextHeadingRel) {
  console.error('CHANGELOG.MD: could not find next `# [` heading after Unreleased');
  process.exit(1);
}
const blockEnd = start + unreleasedHeading[0].length + nextHeadingRel.index;
const block = original.slice(start, blockEnd);

const lines = block.split('\n');
const out = [`# [${version}] - ${date}`];
let i = 1;
while (i < lines.length) {
  const line = lines[i];
  if (line.startsWith('## ')) {
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('## ')) j++;
    const body = lines.slice(i + 1, j).join('\n').trim();
    if (body.length > 0) {
      out.push(line);
      for (let k = i + 1; k < j; k++) out.push(lines[k]);
    }
    i = j;
  } else {
    out.push(line);
    i++;
  }
}

let newBlock = out.join('\n');
if (!newBlock.endsWith('\n\n')) {
  newBlock = newBlock.replace(/\n*$/, '\n\n');
}

let result = original.slice(0, start) + newBlock + original.slice(blockEnd);

const linkRegex = /^\[Unreleased\]: (https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\/release\/([0-9A-Za-z._-]+)\.\.\.HEAD\s*$/m;
const linkMatch = result.match(linkRegex);
if (!linkMatch) {
  console.error('CHANGELOG.MD: could not find `[Unreleased]: .../compare/release/<prev>...HEAD` link');
  process.exit(1);
}
const repoUrl = linkMatch[1];
const prev = linkMatch[2];
const newLink = `[${version}]: ${repoUrl}/compare/release/${prev}...release/${version}`;
result = result.replace(linkRegex, newLink);

writeFileSync(path, result);
console.log(`changelog: released ${version} (date ${date}, previous ${prev})`);
