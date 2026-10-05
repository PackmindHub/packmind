import { createGitRepoId } from '@packmind/types';
import {
  buildRepoApplyPlan,
  rowsShownInDrawer,
  SavedRow,
} from './repoApplyPlan';
import { RepoSelection } from './types';

const row = (branch: string, isTracked: boolean, id = branch): SavedRow => ({
  id: createGitRepoId(id),
  owner: 'o',
  repo: 'r',
  branch,
  isTracked,
});

const sel = (
  branches: string[],
  switches: [string, string][] = [],
): RepoSelection => ({
  tuples: branches.map((branch) => ({ owner: 'o', repo: 'r', branch })),
  switches: new Map(switches),
});

describe('buildRepoApplyPlan', () => {
  describe('when a tracked repo switches branch', () => {
    it('updates the tracked branch', () => {
      expect(
        buildRepoApplyPlan([row('main', true)], sel(['dev'], [['o/r', 'dev']])),
      ).toEqual([
        { kind: 'update-tracked', owner: 'o', repo: 'r', branch: 'dev' },
      ]);
    });
  });

  describe('when a tracked repo switches back to a branch it already has a row for', () => {
    it('updates the tracked branch without removing any row', () => {
      expect(
        buildRepoApplyPlan(
          [row('dev', true), row('main', false)],
          sel(['main'], [['o/r', 'main']]),
        ),
      ).toEqual([
        { kind: 'update-tracked', owner: 'o', repo: 'r', branch: 'main' },
      ]);
    });
  });

  describe('when a legacy repo (no tracked row) switches branch', () => {
    it('starts tracking the chosen branch', () => {
      expect(
        buildRepoApplyPlan(
          [row('main', false), row('feature', false)],
          sel(['dev'], [['o/r', 'dev']]),
        ),
      ).toEqual([
        { kind: 'set-tracked', owner: 'o', repo: 'r', branch: 'dev' },
      ]);
    });
  });

  describe('when a legacy repo has one of its branches unticked', () => {
    it('removes only that row', () => {
      expect(
        buildRepoApplyPlan(
          [row('main', false), row('feature', false)],
          sel(['main']),
        ),
      ).toEqual([
        {
          kind: 'remove',
          repoId: createGitRepoId('feature'),
          label: 'o/r · feature',
        },
      ]);
    });
  });

  describe('when a tracked repo is unticked', () => {
    it('removes the tracked row and its hidden untracked siblings', () => {
      expect(
        buildRepoApplyPlan([row('main', true), row('old', false)], sel([])),
      ).toEqual([
        {
          kind: 'remove',
          repoId: createGitRepoId('main'),
          label: 'o/r · main',
        },
        { kind: 'remove', repoId: createGitRepoId('old'), label: 'o/r · old' },
      ]);
    });
  });

  describe('when an available repo is added', () => {
    it('adds the repository then tracks it', () => {
      expect(buildRepoApplyPlan([], sel(['main']))).toEqual([
        { kind: 'add', owner: 'o', repo: 'r', branch: 'main' },
        { kind: 'set-tracked', owner: 'o', repo: 'r', branch: 'main' },
      ]);
    });
  });

  describe('when nothing changed', () => {
    it('returns no operation', () => {
      expect(buildRepoApplyPlan([row('main', true)], sel(['main']))).toEqual(
        [],
      );
    });
  });

  describe('when a tracked repo with hidden untracked siblings is left unchanged', () => {
    it('returns no operation', () => {
      expect(
        buildRepoApplyPlan(
          [row('main', true), row('dev', false)],
          sel(['main']),
        ),
      ).toEqual([]);
    });
  });

  describe('when a switch targets the branch already tracked', () => {
    it('returns no operation', () => {
      expect(
        buildRepoApplyPlan(
          [row('main', true)],
          sel(['main'], [['o/r', 'main']]),
        ),
      ).toEqual([]);
    });
  });

  describe('when several repos change at once', () => {
    it('orders removes, then adds, then tracking changes', () => {
      const saved: SavedRow[] = [
        { ...row('main', true, 'a-main'), repo: 'a' },
        { ...row('main', true, 'b-main'), repo: 'b' },
      ];
      const selection: RepoSelection = {
        tuples: [
          { owner: 'o', repo: 'a', branch: 'dev' },
          { owner: 'o', repo: 'c', branch: 'main' },
        ],
        switches: new Map([['o/a', 'dev']]),
      };

      expect(buildRepoApplyPlan(saved, selection)).toEqual([
        {
          kind: 'remove',
          repoId: createGitRepoId('b-main'),
          label: 'o/b · main',
        },
        { kind: 'add', owner: 'o', repo: 'c', branch: 'main' },
        { kind: 'update-tracked', owner: 'o', repo: 'a', branch: 'dev' },
        { kind: 'set-tracked', owner: 'o', repo: 'c', branch: 'main' },
      ]);
    });
  });
});

describe('rowsShownInDrawer', () => {
  describe('when a repo is tracked on a branch', () => {
    it('keeps only the tracked row', () => {
      expect(
        rowsShownInDrawer([row('main', true), row('old', false)]).map(
          (r) => r.branch,
        ),
      ).toEqual(['main']);
    });
  });

  describe('when a legacy repo has no tracked row', () => {
    it('keeps every row', () => {
      expect(
        rowsShownInDrawer([row('main', false), row('feature', false)]).map(
          (r) => r.branch,
        ),
      ).toEqual(['main', 'feature']);
    });
  });

  describe('when only another repo is tracked', () => {
    it('keeps the legacy repo rows', () => {
      const other: SavedRow = { ...row('main', true, 'other'), repo: 'r2' };

      expect(
        rowsShownInDrawer([other, row('main', false), row('dev', false)]),
      ).toHaveLength(3);
    });
  });
});
