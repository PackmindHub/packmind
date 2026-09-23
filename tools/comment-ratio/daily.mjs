#!/usr/bin/env node
/**
 * Day-by-day comment ratio over a window around a date.
 *
 * The fortnightly series is too coarse to see what happens around a release:
 * a model that ships on the 24th shares its fortnight with the eight days
 * before it. This walks the same commits one day at a time and records which
 * model produced each day's lines, so the switch and the change land on the
 * same axis.
 *
 * Usage:
 *   node tools/comment-ratio/daily.mjs [--repo <path>] [--ref <ref>]
 *                                      [--around <YYYY-MM-DD>] [--days <n>]
 *                                      [--out <dir>] [--name <file>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { classifyLines, CODE, COMMENT } from './classify.mjs';
import { readBlobs } from './git.mjs';
import { categoryOf } from './files.mjs';
import { streamHistory } from './by-model.mjs';

const options = {
  repo: process.cwd(),
  ref: 'HEAD',
  around: '2026-07-24',
  days: '14',
  out: null,
  // A second window (a rule change, say) needs its own file rather than
  // overwriting the release one.
  name: 'daily.json',
};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2)
  options[argv[i].replace(/^--/, '')] = argv[i + 1];
options.out ??= path.join(options.repo, 'tools/comment-ratio/output');

const DAY = 24 * 3600 * 1000;
const centre = Date.parse(options.around + 'T00:00:00Z');
const span = Number(options.days);
const from = new Date(centre - span * DAY).toISOString().slice(0, 10);
const to = new Date(centre + (span + 1) * DAY).toISOString().slice(0, 10);

const days = new Map();
const dayFor = (date) => {
  if (!days.has(date))
    days.set(date, {
      date,
      addedCode: 0,
      addedComment: 0,
      commits: 0,
      byModel: {},
    });
  return days.get(date);
};

const work = [];
await streamHistory(
  options.repo,
  options.ref,
  (commit) => {
    const date = commit.date.slice(0, 10);
    if (date < from || date >= to) return;
    let touched = false;
    for (const file of commit.files) {
      if (!file.newPath || !file.dstBlob || file.added.length === 0) continue;
      if (categoryOf(file.newPath) === null) continue;
      const lines = [];
      for (const [start, count] of file.added)
        for (let i = 0; i < count; i++) lines.push(start + i);
      work.push({
        blob: file.dstBlob,
        path: file.newPath,
        lines,
        date,
        model: commit.model,
      });
      touched = true;
    }
    if (touched) dayFor(date).commits++;
  },
  [`--since=${from}T00:00:00+00:00`, `--until=${to}T00:00:00+00:00`],
);

const byBlob = new Map();
for (const item of work) {
  if (!byBlob.has(item.blob)) byBlob.set(item.blob, []);
  byBlob.get(item.blob).push(item);
}

const blobs = [...byBlob.keys()];
for (let i = 0; i < blobs.length; i += 1000) {
  const batch = blobs.slice(i, i + 1000);
  const contents = await readBlobs(options.repo, batch);
  for (const blob of batch) {
    const items = byBlob.get(blob);
    const classes = classifyLines(items[0].path, contents.get(blob) ?? '');
    for (const item of items) {
      const bucket = dayFor(item.date);
      bucket.byModel[item.model] ??= 0;
      for (const lineNumber of item.lines) {
        const cls = classes[lineNumber - 1];
        if (cls === COMMENT) bucket.addedComment++;
        else if (cls === CODE) bucket.addedCode++;
        else continue;
        bucket.byModel[item.model]++;
      }
    }
  }
}

const rows = [...days.values()]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((d) => {
    const added = d.addedCode + d.addedComment;
    // The day is labelled with whichever model wrote most of its lines.
    const model =
      Object.entries(d.byModel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      ...d,
      added,
      commentRatio: added === 0 ? null : d.addedComment / added,
      model,
    };
  })
  .filter((d) => d.added > 0);

fs.mkdirSync(options.out, { recursive: true });
fs.writeFileSync(
  path.join(options.out, options.name),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      around: options.around,
      from,
      to,
      days: rows,
    },
    null,
    2,
  ),
);

process.stderr.write(`${from} -> ${to}\n`);
for (const d of rows)
  process.stderr.write(
    `  ${d.date}  ${String(d.added).padStart(6)} lines  ` +
      `${(d.commentRatio * 100).toFixed(1).padStart(5)}%  ${d.model}\n`,
  );
process.stderr.write(`\nWrote ${path.join(options.out, options.name)}\n`);
