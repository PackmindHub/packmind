import { GitRepoId } from '@packmind/types';
import { RepoSelection, repoKey } from './types';

export type SavedRow = {
  id: GitRepoId;
  owner: string;
  repo: string;
  branch: string;
  isTracked: boolean;
};

export type RepoOperation =
  | { kind: 'remove'; repoId: GitRepoId; label: string }
  | { kind: 'add'; owner: string; repo: string; branch: string }
  | { kind: 'set-tracked'; owner: string; repo: string; branch: string }
  | { kind: 'update-tracked'; owner: string; repo: string; branch: string };

const removeOf = (row: SavedRow): RepoOperation => ({
  kind: 'remove',
  repoId: row.id,
  label: `${row.owner}/${row.repo} · ${row.branch}`,
});

/**
 * Removes run first, then adds, then tracking changes. A switch is never a
 * remove: the branch left behind keeps its row, hence its own history, exactly
 * as `packmind git track --update` leaves it.
 */
export function buildRepoApplyPlan(
  saved: SavedRow[],
  selection: RepoSelection,
): RepoOperation[] {
  const savedByRepo = groupBy(saved, repoKey);
  const selectedByRepo = groupBy(selection.tuples, repoKey);
  const removes: RepoOperation[] = [];
  const adds: RepoOperation[] = [];
  const tracking: RepoOperation[] = [];

  for (const key of new Set([
    ...savedByRepo.keys(),
    ...selectedByRepo.keys(),
  ])) {
    const rows = savedByRepo.get(key) ?? [];
    const selected = selectedByRepo.get(key) ?? [];

    // The drawer only shows a tracked repo's tracked row, so unticking it
    // empties the repo: its hidden siblings must go too, or the repo would
    // come back as a legacy one.
    if (selected.length === 0) {
      removes.push(...rows.map(removeOf));
      continue;
    }

    const [{ owner, repo, branch: firstBranch }] = selected;

    if (rows.length === 0) {
      adds.push({ kind: 'add', owner, repo, branch: firstBranch });
      tracking.push({ kind: 'set-tracked', owner, repo, branch: firstBranch });
      continue;
    }

    const tracked = rows.find((r) => r.isTracked);
    const switchedTo = selection.switches.get(key);

    if (switchedTo !== undefined) {
      if (tracked?.branch !== switchedTo) {
        tracking.push({
          kind: tracked ? 'update-tracked' : 'set-tracked',
          owner,
          repo,
          branch: switchedTo,
        });
      }
      continue;
    }

    // A tracked repo's untracked siblings are hidden from the drawer, so the
    // selection never lists them: only a legacy repo can untick a branch.
    if (tracked) continue;

    const kept = new Set(selected.map((t) => t.branch));
    removes.push(...rows.filter((r) => !kept.has(r.branch)).map(removeOf));
  }

  return [...removes, ...adds, ...tracking];
}

/**
 * The rows the drawer lists: a tracked repository's tracked row only, every
 * row of a legacy repository. Hidden rows stay saved, with their history.
 */
export function rowsShownInDrawer<
  T extends { owner: string; repo: string; isTracked: boolean },
>(rows: T[]): T[] {
  const trackedRepos = new Set(rows.filter((r) => r.isTracked).map(repoKey));
  return rows.filter((r) => r.isTracked || !trackedRepos.has(repoKey(r)));
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
