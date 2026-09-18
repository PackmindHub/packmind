/** Thin wrappers around the git plumbing commands the collector needs. */
import { spawn, execFileSync } from 'node:child_process';

// `core.quotePath=false` keeps non-ASCII paths readable in patch output.
const BASE_ARGS = ['-c', 'core.quotePath=false'];

export function git(repo, args, { maxBuffer = 512 * 1024 * 1024 } = {}) {
  return execFileSync('git', [...BASE_ARGS, ...args], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer,
  });
}

/** Last commit reachable from `ref` whose committer date is strictly before `isoDate`. */
export function commitBefore(repo, ref, isoDate) {
  const sha = git(repo, [
    'rev-list',
    '-n',
    '1',
    `--before=${isoDate}`,
    ref,
  ]).trim();
  return sha || null;
}

export function commitDate(repo, sha) {
  return git(repo, ['show', '-s', '--format=%cI', sha]).trim();
}

/**
 * Every blob of a tree, as a Map of path -> blob sha.
 * `-z` avoids git's path quoting rules entirely.
 */
export function listTree(repo, sha) {
  const raw = git(repo, ['ls-tree', '-r', '-z', sha]);
  const entries = new Map();
  for (const record of raw.split('\0')) {
    if (!record) continue;
    const tab = record.indexOf('\t');
    if (tab === -1) continue;
    const [, type, blob] = record.slice(0, tab).split(/\s+/);
    if (type !== 'blob') continue;
    entries.set(record.slice(tab + 1), blob);
  }
  return entries;
}

/**
 * Read many blobs in a single `git cat-file --batch` process.
 * @returns {Promise<Map<string, string>>} blob sha -> UTF-8 content
 */
export function readBlobs(repo, shas) {
  if (shas.length === 0) return Promise.resolve(new Map());

  return new Promise((resolve, reject) => {
    const child = spawn('git', [...BASE_ARGS, 'cat-file', '--batch'], {
      cwd: repo,
    });
    const chunks = [];
    let stderr = '';

    child.on('error', reject);
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));

    child.on('close', (code) => {
      // Without this, a failed read would resolve to an empty map and every
      // blob would silently be classified as a zero-line file.
      if (code !== 0) {
        reject(
          new Error(`git cat-file --batch exited ${code}: ${stderr.trim()}`),
        );
        return;
      }
      const buffer = Buffer.concat(chunks);
      const blobs = new Map();
      let offset = 0;

      while (offset < buffer.length) {
        const newline = buffer.indexOf(0x0a, offset);
        if (newline === -1) break;
        const [sha, type, size] = buffer
          .toString('utf8', offset, newline)
          .split(' ');
        if (type !== 'blob') {
          // "<sha> missing" and other non-blob answers carry no payload.
          offset = newline + 1;
          continue;
        }
        const start = newline + 1;
        const end = start + Number(size);
        blobs.set(sha, buffer.toString('utf8', start, end));
        offset = end + 1; // skip the trailing newline git appends
      }

      if (blobs.size !== new Set(shas).size) {
        reject(
          new Error(
            `git cat-file --batch returned ${blobs.size} of ${new Set(shas).size} blobs`,
          ),
        );
        return;
      }
      resolve(blobs);
    });

    child.stdin.end(shas.join('\n') + '\n');
  });
}

/**
 * The path out of a `--- a/<path>` or `+++ b/<path>` header.
 * Git terminates the path with a tab when it contains a space.
 */
export function headerPath(line, prefix) {
  const value = line.slice(4).replace(/\t.*$/, '');
  if (value === '/dev/null') return null;
  return value.startsWith(prefix + '/')
    ? value.slice(prefix.length + 1)
    : value;
}

/**
 * Net diff between two commits, as added/removed line numbers per file.
 *
 * `--unified=0` makes every hunk header describe exactly the changed lines,
 * so the header alone is enough and the payload can be ignored. Rename
 * detection stays on, so moving a file does not look like newly written code.
 *
 * @returns {Map<string, {oldPath: string|null, newPath: string|null,
 *                        added: number[], removed: number[]}>}
 */
export function diffLineNumbers(repo, fromSha, toSha, pathspecs) {
  const raw = git(repo, [
    'diff',
    '--unified=0',
    '--no-color',
    '--find-renames',
    fromSha,
    toSha,
    '--',
    ...pathspecs,
  ]);

  const files = new Map();
  let current = null;

  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = { oldPath: null, newPath: null, added: [], removed: [] };
      continue;
    }
    if (!current) continue;

    // Header lines only precede the first hunk. Past that, a removed source
    // line starting with `-- ` reaches the patch as `--- ` and must not be
    // mistaken for one.
    if (
      line.startsWith('--- ') &&
      current.added.length + current.removed.length === 0
    ) {
      current.oldPath = headerPath(line, 'a');
      continue;
    }
    if (
      line.startsWith('+++ ') &&
      current.added.length + current.removed.length === 0
    ) {
      current.newPath = headerPath(line, 'b');
      files.set(current.newPath ?? current.oldPath, current);
      continue;
    }
    if (line.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match) continue;
      const oldStart = Number(match[1]);
      const oldCount = match[2] === undefined ? 1 : Number(match[2]);
      const newStart = Number(match[3]);
      const newCount = match[4] === undefined ? 1 : Number(match[4]);
      for (let i = 0; i < oldCount; i++) current.removed.push(oldStart + i);
      for (let i = 0; i < newCount; i++) current.added.push(newStart + i);
    }
  }

  return files;
}
