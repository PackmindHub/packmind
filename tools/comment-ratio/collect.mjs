#!/usr/bin/env node
/**
 * Month-by-month comment-ratio history of the TypeScript sources in this repo.
 *
 * Two different questions are answered, because they do not have the same answer:
 *
 *   1. STOCK  - at the first day of each month, what share of the non-blank
 *               lines in the codebase are comment lines?
 *   2. FLOW   - of the lines *added* during that month (net diff between two
 *               month boundaries), what share are comment lines?
 *
 * The stock moves slowly and is dominated by the existing code base; the flow
 * is what actually reflects how code was written that month. Removed lines are
 * reported too, so that "were old comments deleted?" can be answered as well.
 *
 * Usage:
 *   node tools/comment-ratio/collect.mjs [options]
 *
 *   --repo <path>    repository to analyse            (default: cwd)
 *   --ref <ref>      branch/ref to walk               (default: HEAD)
 *   --to <YYYY-MM>   last month to include            (default: current month)
 *   --out <dir>      output directory                 (default: tools/comment-ratio/output)
 */
import fs from 'node:fs';
import path from 'node:path';
import { classifyLines, BLANK, CODE, COMMENT } from './classify.mjs';
import { categoryOf, CATEGORIES } from './files.mjs';
import {
  git,
  commitBefore,
  commitDate,
  listTree,
  readBlobs,
  diffLineNumbers,
} from './git.mjs';

const PATHSPECS = ['*.ts', '*.tsx'];

// Roll-ups reported alongside the raw categories.
const GROUPS = {
  all: CATEGORIES,
  prod: ['ts', 'tsx'],
  spec: ['spec.ts', 'spec.tsx'],
  backend: ['ts', 'spec.ts'],
  frontend: ['tsx', 'spec.tsx'],
};

function parseArgs(argv) {
  const options = {
    repo: process.cwd(),
    ref: 'HEAD',
    to: null,
    out: null,
    // Models ship mid-month, so a monthly sample cannot separate the weeks
    // before a release from the weeks after it. Sample twice a month.
    step: 'half-month',
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in options)) throw new Error(`Unknown option: ${argv[i]}`);
    options[key] = argv[i + 1];
  }
  options.out ??= path.join(options.repo, 'tools/comment-ratio/output');
  return options;
}

function monthOf(isoDate) {
  return isoDate.slice(0, 7);
}

/**
 * Sampling days strictly after `afterDay`, up to the end of `toMonth`:
 * the 1st and the 15th of each month, or only the 1st under `step: 'month'`.
 */
function boundaryDays(afterDay, toMonth, step) {
  const days = [];
  let [year, month] = afterDay.slice(0, 7).split('-').map(Number);
  for (;;) {
    for (const day of step === 'month' ? ['01'] : ['01', '15']) {
      const label = `${year}-${String(month).padStart(2, '0')}-${day}`;
      if (label.slice(0, 7) > toMonth) return days;
      if (label > afterDay) days.push(label);
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

/** Resolve the commits the history is sampled at. */
function resolveBoundaries(repo, ref, toMonth, step) {
  const rootSha = git(repo, ['rev-list', '--max-parents=0', ref])
    .trim()
    .split('\n')
    .pop();
  const rootDate = commitDate(repo, rootSha);
  const headSha = git(repo, ['rev-parse', ref]).trim();
  const headDate = commitDate(repo, headSha);

  const boundaries = [
    {
      label: rootDate.slice(0, 10),
      date: rootDate,
      sha: rootSha,
      kind: 'root',
    },
  ];

  for (const day of boundaryDays(rootDate.slice(0, 10), toMonth, step)) {
    // Explicit UTC, so the sampled commits do not depend on the machine's zone.
    const sha = commitBefore(repo, ref, `${day}T00:00:00+00:00`);
    if (!sha) continue;
    boundaries.push({
      label: day,
      date: commitDate(repo, sha),
      sha,
      kind: 'month-start',
    });
  }

  if (boundaries.at(-1).sha !== headSha) {
    boundaries.push({
      label: headDate.slice(0, 10),
      date: headDate,
      sha: headSha,
      kind: 'head',
    });
  }
  return boundaries;
}

/** Cache of blob sha -> per-line classification, shared by every snapshot. */
class LineClassCache {
  constructor(repo) {
    this.repo = repo;
    this.cache = new Map();
  }

  async load(entries) {
    const missing = [
      ...new Set(
        entries.filter(([, sha]) => !this.cache.has(sha)).map(([, sha]) => sha),
      ),
    ];
    const pathOf = new Map(entries.map(([filePath, sha]) => [sha, filePath]));

    for (let i = 0; i < missing.length; i += 1500) {
      const batch = missing.slice(i, i + 1500);
      const blobs = await readBlobs(this.repo, batch);
      for (const sha of batch) {
        const text = blobs.get(sha) ?? '';
        this.cache.set(sha, classifyLines(pathOf.get(sha), text));
      }
    }
  }

  get(sha) {
    return this.cache.get(sha);
  }
}

function emptyTotals() {
  return { files: 0, blank: 0, code: 0, comment: 0 };
}

function emptyDelta() {
  return { addedCode: 0, addedComment: 0, removedCode: 0, removedComment: 0 };
}

function ratio(comment, code) {
  const total = comment + code;
  return total === 0 ? null : comment / total;
}

/** Sum the per-category buckets into the roll-ups, and attach comment ratios. */
function withGroups(perCategory, factory, commentKey, codeKey) {
  const result = { ...perCategory };
  for (const [group, members] of Object.entries(GROUPS)) {
    const total = factory();
    for (const member of members) {
      for (const key of Object.keys(total))
        total[key] += perCategory[member][key];
    }
    result[group] = total;
  }
  for (const bucket of Object.values(result)) {
    bucket.commentRatio = ratio(bucket[commentKey], bucket[codeKey]);
  }
  return result;
}

async function measureSnapshot(cache, tree) {
  const entries = [...tree].filter(
    ([filePath]) => categoryOf(filePath) !== null,
  );
  await cache.load(entries);

  const perCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, emptyTotals()]),
  );
  for (const [filePath, sha] of entries) {
    const bucket = perCategory[categoryOf(filePath)];
    bucket.files++;
    for (const cls of cache.get(sha)) {
      if (cls === BLANK) bucket.blank++;
      else if (cls === CODE) bucket.code++;
      else bucket.comment++;
    }
  }
  return withGroups(perCategory, emptyTotals, 'comment', 'code');
}

function measureFlow(cache, diff, fromTree, toTree) {
  const perCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, emptyDelta()]),
  );

  const tally = (filePath, tree, lineNumbers, commentKey, codeKey) => {
    const category = filePath === null ? null : categoryOf(filePath);
    if (category === null) return;
    const classes = cache.get(tree.get(filePath));
    if (!classes) return;
    for (const lineNumber of lineNumbers) {
      const cls = classes[lineNumber - 1];
      if (cls === COMMENT) perCategory[category][commentKey]++;
      else if (cls === CODE) perCategory[category][codeKey]++;
    }
  };

  for (const file of diff.values()) {
    tally(file.newPath, toTree, file.added, 'addedComment', 'addedCode');
    tally(
      file.oldPath,
      fromTree,
      file.removed,
      'removedComment',
      'removedCode',
    );
  }
  return withGroups(perCategory, emptyDelta, 'addedComment', 'addedCode');
}

function toCsv(report) {
  const header = [
    'period_start',
    'period_end',
    'month',
    'scope',
    'snapshot_date',
    'files',
    'code_lines',
    'comment_lines',
    'stock_comment_ratio',
    'added_code',
    'added_comment',
    'flow_comment_ratio',
    'removed_code',
    'removed_comment',
    'partial_month',
    'seeded_month',
  ];
  const scopes = [...CATEGORIES, ...Object.keys(GROUPS)];
  const rows = [header.join(',')];

  for (const month of report.months) {
    for (const scope of scopes) {
      const stock = month.stockAtEnd[scope];
      const flow = month.flow[scope];
      rows.push(
        [
          month.period,
          month.periodEnd,
          month.month,
          scope,
          month.to.label,
          stock.files,
          stock.code,
          stock.comment,
          stock.commentRatio?.toFixed(6) ?? '',
          flow.addedCode,
          flow.addedComment,
          flow.commentRatio?.toFixed(6) ?? '',
          flow.removedCode,
          flow.removedComment,
          month.partial ? 'true' : 'false',
          month.seeded ? 'true' : 'false',
        ].join(','),
      );
    }
  }
  return rows.join('\n') + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const toMonth = options.to ?? new Date().toISOString().slice(0, 7);

  const boundaries = resolveBoundaries(
    options.repo,
    options.ref,
    toMonth,
    options.step,
  );
  process.stderr.write(
    `Sampling ${boundaries.length} commits (${boundaries[0].label} -> ${boundaries.at(-1).label})\n`,
  );

  const cache = new LineClassCache(options.repo);
  const snapshots = [];

  for (const boundary of boundaries) {
    const tree = listTree(options.repo, boundary.sha);
    const totals = await measureSnapshot(cache, tree);
    snapshots.push({ ...boundary, tree, totals });
    process.stderr.write(
      `  ${boundary.label}  ${String(totals.all.files).padStart(5)} files  ` +
        `${String(totals.all.code).padStart(7)} code  ` +
        `${(totals.all.commentRatio * 100).toFixed(2)}% comments\n`,
    );
  }

  const months = [];
  for (let i = 1; i < snapshots.length; i++) {
    const from = snapshots[i - 1];
    const to = snapshots[i];
    const diff = diffLineNumbers(options.repo, from.sha, to.sha, PATHSPECS);
    const flow = measureFlow(cache, diff, from.tree, to.tree);
    months.push({
      // A period is named by the day its *opening* boundary opens, not by the
      // date of the commit that happened to be the last one before it.
      period: from.kind === 'root' ? from.date.slice(0, 10) : from.label,
      periodEnd: to.label,
      month: from.kind === 'root' ? monthOf(from.date) : monthOf(from.label),
      // The first delta is the initial import of an already existing codebase,
      // not a month of normal development.
      seeded: from.kind === 'root',
      partial: to.kind === 'head',
      from: { label: from.label, sha: from.sha, date: from.date },
      to: { label: to.label, sha: to.sha, date: to.date },
      flow,
      stockAtEnd: to.totals,
    });
    const period = months.at(-1);
    process.stderr.write(
      `  ${period.period} -> ${period.periodEnd}${period.seeded ? ' (import)' : period.partial ? ' (partial)' : '        '}  +${String(flow.all.addedCode + flow.all.addedComment).padStart(7)} lines  ` +
        `${flow.all.commentRatio === null ? '   n/a' : (flow.all.commentRatio * 100).toFixed(2) + '%'} of added lines are comments\n`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    repo: git(options.repo, ['rev-parse', '--show-toplevel']).trim(),
    ref: options.ref,
    categories: CATEGORIES,
    groups: GROUPS,
    snapshots: snapshots.map(({ tree, ...rest }) => rest),
    months,
  };

  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(
    path.join(options.out, 'comment-ratio.json'),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(path.join(options.out, 'comment-ratio.csv'), toCsv(report));
  process.stderr.write(
    `\nWrote ${path.join(options.out, 'comment-ratio.json')} and comment-ratio.csv\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
