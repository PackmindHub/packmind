#!/usr/bin/env node
/**
 * Comment ratio of added lines, broken down by the Claude model that
 * co-authored the commit.
 *
 * Commits made through Claude Code carry a `Co-Authored-By: Claude <model>`
 * trailer, so the model is recorded in the history itself. That turns "the
 * ratio moved in the month a model shipped" into "commits attributed to that
 * model have this ratio", which is a much stronger statement: it no longer
 * depends on when in the month the model landed, and commits written by other
 * models during the same month no longer pollute the bucket.
 *
 * Caveats the output reports rather than hides:
 *   - Commits with no trailer are counted separately; early history has almost
 *     none, so its attribution is unknown rather than "human".
 *   - The repository squash-merges pull requests, so one trailer covers one
 *     pull request's worth of work.
 *   - The trailer records the model of the session that produced the commit,
 *     not necessarily the model that wrote every line in it.
 *
 * Usage:
 *   node tools/comment-ratio/by-model.mjs [--repo <path>] [--ref <ref>] [--out <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { classifyLines, CODE, COMMENT } from './classify.mjs';
import { readBlobs, headerPath } from './git.mjs';
import { categoryOf } from './files.mjs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDENTITIES = JSON.parse(
  fs.readFileSync(path.join(here, 'identities.json'), 'utf8'),
).byEmail;

const EMPTY_BLOB = /^0+$/;
const KEY_SEP = ' :: '; // month/model composite Map key
const UNATTRIBUTED = 'no Claude trailer';
const UNSPECIFIED = 'Claude (version not recorded)';
const SEVERAL = 'several models named';

/**
 * Pick the Claude model out of a commit message's Co-Authored-By lines.
 *
 * Read from the raw message rather than through `%(trailers:...)`: git only
 * exposes a trailer when it sits, unindented, in the message's last paragraph,
 * and a few dozen commits here do not satisfy that.
 *
 * A trailer can carry a suffix after the version — `Claude Opus 5 (1M context)`
 * is the same model as `Claude Opus 5` and must land in the same bucket.
 */
export function modelOf(message) {
  const pattern = /^[ \t]*Co-authored-by:[ \t]*(Claude[^<\n]*)/gim;
  const named = new Set();
  let unversioned = false;

  for (const [, raw] of message.matchAll(pattern)) {
    const match =
      /^Claude\s+(Opus|Sonnet|Haiku|Fable|Mythos)\s+([\d.]+)\b/.exec(
        raw.trim(),
      );
    if (match) named.add(`Claude ${match[1]} ${match[2]}`);
    else unversioned = true; // bare "Claude", "Claude (AI Assistant)", ...
  }

  // A squashed pull request can name several models. Which lines came from
  // which is not recorded, so the commit goes to its own bucket rather than
  // being credited, by message order, to whichever is mentioned first.
  if (named.size > 1) return SEVERAL;
  if (named.size === 1) return [...named][0];
  return unversioned ? UNSPECIFIED : UNATTRIBUTED;
}

/**
 * Stream the whole history as a patch and collect, per commit and per file,
 * which line numbers were added and removed and which blobs to read them from.
 */
function streamHistory(repo, ref, onCommit) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      [
        '-c',
        'core.quotePath=false',
        'log',
        ref,
        '--no-merges',
        '--reverse',
        '--find-renames',
        '--full-index', // so `index <src>..<dst>` carries complete blob shas
        '--unified=0',
        '--patch',
        // %x00 opens a commit record; the body runs to the %x02 sentinel.
        '--format=%x00%H%x1f%cI%x1f%ae%x1f%an%x1f%B%x02',
        '--',
        '*.ts',
        '*.tsx',
      ],
      { cwd: repo, stdio: ['ignore', 'pipe', 'inherit'] },
    );

    const lines = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });
    let commit = null;
    let file = null;
    // A commit record's header spans several lines, because it carries the raw
    // message; it is accumulated until the sentinel closes it.
    let header = null;

    const openCommit = (text) => {
      const [sha, date, email, name, ...rest] = text.split('\x1f');
      commit = {
        sha,
        date,
        person: IDENTITIES[(email ?? '').toLowerCase()] ?? name ?? '(inconnu)',
        model: modelOf(rest.join('\x1f')),
        files: [],
      };
    };

    const closeFile = () => {
      if (commit && file && (file.added.length || file.removed.length))
        commit.files.push(file);
      file = null;
    };
    const closeCommit = () => {
      closeFile();
      if (commit) onCommit(commit);
      commit = null;
    };

    lines.on('line', (line) => {
      if (header !== null) {
        const end = line.indexOf('\x02');
        header += '\n' + (end === -1 ? line : line.slice(0, end));
        if (end !== -1) {
          openCommit(header);
          header = null;
        }
        return;
      }
      if (line.startsWith('\0')) {
        closeCommit();
        const rest = line.slice(1);
        const end = rest.indexOf('\x02');
        if (end === -1) header = rest;
        else openCommit(rest.slice(0, end));
        return;
      }
      if (!commit) return;

      if (line.startsWith('diff --git ')) {
        closeFile();
        file = {
          oldPath: null,
          newPath: null,
          srcBlob: null,
          dstBlob: null,
          added: [],
          removed: [],
        };
        return;
      }
      if (!file) return;

      if (line.startsWith('index ')) {
        const [src, dst] = line.slice(6).split(' ')[0].split('..');
        file.srcBlob = EMPTY_BLOB.test(src) ? null : src;
        file.dstBlob = EMPTY_BLOB.test(dst) ? null : dst;
        return;
      }
      // Header lines only precede the first hunk; past that, a removed source
      // line starting with `-- ` reaches the patch looking like one.
      const beforeFirstHunk = file.added.length + file.removed.length === 0;
      if (line.startsWith('--- ') && beforeFirstHunk) {
        file.oldPath = headerPath(line, 'a');
        return;
      }
      if (line.startsWith('+++ ') && beforeFirstHunk) {
        file.newPath = headerPath(line, 'b');
        return;
      }
      if (line.startsWith('@@')) {
        const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (!m) return;
        const removed = m[2] === undefined ? 1 : Number(m[2]);
        const added = m[4] === undefined ? 1 : Number(m[4]);
        if (removed > 0) file.removed.push([Number(m[1]), removed]);
        if (added > 0) file.added.push([Number(m[3]), added]);
      }
    });

    lines.on('close', () => {
      closeCommit();
      resolve();
    });
    child.on('error', reject);
  });
}

function emptyBucket() {
  return {
    commits: 0,
    addedCode: 0,
    addedComment: 0,
    removedCode: 0,
    removedComment: 0,
  };
}

function bucketFor(map, key) {
  if (!map.has(key)) map.set(key, emptyBucket());
  return map.get(key);
}

function expand(ranges) {
  const out = [];
  for (const [start, count] of ranges)
    for (let i = 0; i < count; i++) out.push(start + i);
  return out;
}

async function main() {
  const options = { repo: process.cwd(), ref: 'HEAD', out: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2)
    options[argv[i].replace(/^--/, '')] = argv[i + 1];
  options.out ??= path.join(options.repo, 'tools/comment-ratio/output');

  // One work item per (blob, set of line numbers to classify inside it).
  const work = [];
  const byModel = new Map();
  const byMonthModel = new Map();
  const byPersonModel = new Map();
  // Per-commit totals, so the headline ratio can be checked against the median
  // commit: a mean over pooled lines can be carried by a handful of large ones.
  const perCommit = new Map();
  let commitCount = 0;

  process.stderr.write('Reading history...\n');
  await streamHistory(options.repo, options.ref, (commit) => {
    commitCount++;
    const month = commit.date.slice(0, 7);
    let touchedTs = false;

    for (const file of commit.files) {
      const addCategory = file.newPath && categoryOf(file.newPath);
      const removeCategory = file.oldPath && categoryOf(file.oldPath);
      if (addCategory && file.dstBlob && file.added.length) {
        work.push({
          blob: file.dstBlob,
          path: file.newPath,
          lines: expand(file.added),
          model: commit.model,
          month,
          person: commit.person,
          commentKey: 'addedComment',
          codeKey: 'addedCode',
          commit: commit.sha,
        });
        touchedTs = true;
      }
      if (removeCategory && file.srcBlob && file.removed.length) {
        work.push({
          blob: file.srcBlob,
          path: file.oldPath,
          lines: expand(file.removed),
          model: commit.model,
          month,
          person: commit.person,
          commentKey: 'removedComment',
          codeKey: 'removedCode',
          commit: commit.sha,
        });
        touchedTs = true;
      }
    }

    if (touchedTs) {
      bucketFor(byModel, commit.model).commits++;
      bucketFor(byMonthModel, `${month}${KEY_SEP}${commit.model}`).commits++;
      bucketFor(byPersonModel, `${commit.person}${KEY_SEP}${commit.model}`)
        .commits++;
      perCommit.set(commit.sha, {
        model: commit.model,
        addedCode: 0,
        addedComment: 0,
      });
    }
  });

  process.stderr.write(
    `${commitCount} commits, ${work.length} file revisions to classify\n`,
  );

  // Group by blob so each blob is read and parsed once.
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
        const model = bucketFor(byModel, item.model);
        const monthly = bucketFor(
          byMonthModel,
          `${item.month}${KEY_SEP}${item.model}`,
        );
        const personal = bucketFor(
          byPersonModel,
          `${item.person}${KEY_SEP}${item.model}`,
        );
        for (const lineNumber of item.lines) {
          const cls = classes[lineNumber - 1];
          const key =
            cls === COMMENT
              ? item.commentKey
              : cls === CODE
                ? item.codeKey
                : null;
          if (!key) continue;
          model[key]++;
          monthly[key]++;
          personal[key]++;
          const commit = perCommit.get(item.commit);
          if (commit && key.startsWith('added')) commit[key]++;
        }
      }
      byBlob.delete(blob);
    }
    process.stderr.write(
      `  classified ${Math.min(i + 1000, blobs.length)}/${blobs.length} blobs\r`,
    );
  }
  process.stderr.write('\n');

  /** Median comment ratio over commits that added at least `floor` lines. */
  const commitDistribution = (model, floor = 50) => {
    const ratios = [...perCommit.values()]
      .filter((c) => c.model === model && c.addedCode + c.addedComment >= floor)
      .map((c) => c.addedComment / (c.addedCode + c.addedComment))
      .sort((a, b) => a - b);
    if (ratios.length === 0)
      return { commits: 0, median: null, p25: null, p75: null };
    // Linear interpolation between order statistics: with an even count the
    // median is the mean of the two middle values, not the upper one.
    const at = (q) => {
      const position = (ratios.length - 1) * q;
      const lower = Math.floor(position);
      const upper = Math.ceil(position);
      return (
        ratios[lower] + (ratios[upper] - ratios[lower]) * (position - lower)
      );
    };
    return {
      commits: ratios.length,
      median: at(0.5),
      p25: at(0.25),
      p75: at(0.75),
    };
  };

  const withRatio = (bucket) => ({
    ...bucket,
    addedTotal: bucket.addedCode + bucket.addedComment,
    commentRatio:
      bucket.addedCode + bucket.addedComment === 0
        ? null
        : bucket.addedComment / (bucket.addedCode + bucket.addedComment),
  });

  const report = {
    generatedAt: new Date().toISOString(),
    ref: options.ref,
    commitsScanned: commitCount,
    byModel: Object.fromEntries(
      [...byModel].map(([k, v]) => [
        k,
        { ...withRatio(v), commitDistribution: commitDistribution(k) },
      ]),
    ),
    byMonthAndModel: [...byMonthModel].map(([key, value]) => {
      const [month, model] = key.split(KEY_SEP);
      return { month, model, ...withRatio(value) };
    }),
    byPersonAndModel: [...byPersonModel].map(([key, value]) => {
      const [person, model] = key.split(KEY_SEP);
      return { person, model, ...withRatio(value) };
    }),
  };

  fs.mkdirSync(options.out, { recursive: true });
  fs.writeFileSync(
    path.join(options.out, 'by-model.json'),
    JSON.stringify(report, null, 2),
  );

  const rows = [
    'model,commits,added_code,added_comment,pooled_comment_ratio,median_commit_ratio,p25,p75,commits_over_50_lines,removed_code,removed_comment',
  ];
  const sorted = Object.entries(report.byModel).sort(
    (a, b) => b[1].addedTotal - a[1].addedTotal,
  );
  for (const [model, bucket] of sorted) {
    rows.push(
      [
        `"${model}"`,
        bucket.commits,
        bucket.addedCode,
        bucket.addedComment,
        bucket.commentRatio?.toFixed(6) ?? '',
        bucket.commitDistribution.median?.toFixed(6) ?? '',
        bucket.commitDistribution.p25?.toFixed(6) ?? '',
        bucket.commitDistribution.p75?.toFixed(6) ?? '',
        bucket.commitDistribution.commits,
        bucket.removedCode,
        bucket.removedComment,
      ].join(','),
    );
  }
  fs.writeFileSync(
    path.join(options.out, 'by-model.csv'),
    rows.join('\n') + '\n',
  );

  const pct = (v) =>
    v === null ? '   n/a' : (v * 100).toFixed(2).padStart(6) + '%';
  process.stderr.write(
    '\n  model                          commits   +code  +comment   pooled  median(>=50)   p25    p75    n\n',
  );
  for (const [model, bucket] of sorted) {
    if (bucket.addedTotal === 0) continue;
    const d = bucket.commitDistribution;
    process.stderr.write(
      `  ${model.padEnd(30)} ${String(bucket.commits).padStart(7)} ${String(bucket.addedCode).padStart(7)} ` +
        `${String(bucket.addedComment).padStart(9)}  ${pct(bucket.commentRatio)}  ${pct(d.median)}` +
        `  ${pct(d.p25)} ${pct(d.p75)} ${String(d.commits).padStart(4)}\n`,
    );
  }
  process.stderr.write(
    `\nWrote ${path.join(options.out, 'by-model.json')} and by-model.csv\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
