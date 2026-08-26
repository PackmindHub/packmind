import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { GitService } from './GitService';

/**
 * Runs the real `git` binary instead of a mocked runner.
 *
 * `branchExists` reads git's own output, so what breaks it is what git actually
 * prints — checkout markers, color, columns — which a hand-written `stdout`
 * fixture cannot reproduce: every mocked case here passed while a branch held
 * by a linked worktree was being refused in real repositories. These tests are
 * the guard for that class of regression; the mocked suite in `GitService.spec`
 * covers the parsing itself.
 */
describe('GitService against real git', () => {
  let root: string;
  let repoPath: string;
  let service: GitService;

  const git = (args: string, cwd: string = repoPath) =>
    execSync(`git ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

  const addWorktreeFor = (branch: string) =>
    git(`worktree add -q "${path.join(root, `wt-${branch}`)}" ${branch}`);

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'packmind-git-service-'));
    repoPath = path.join(root, 'repo');
    execSync(`git init -q -b main "${repoPath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    git('config user.email test@packmind.com');
    git('config user.name Packmind');
    git('config commit.gpgsign false');
    git('commit -q --allow-empty -m "initial commit"');
    git('branch feature');

    service = new GitService();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('when the branch is checked out in a linked worktree', () => {
    // git marks it `+ feature` instead of `  feature`.
    it('reports the branch exists', () => {
      addWorktreeFor('feature');

      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });
  });

  describe('when color output is forced', () => {
    beforeEach(() => {
      // `always` colors even through a pipe, which is how the CLI runs git.
      git('config color.ui always');
    });

    it('reports another branch exists', () => {
      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });

    it('reports the checked-out branch exists', () => {
      expect(service.branchExists(repoPath, 'main')).toBe(true);
    });
  });

  describe('when column output is forced', () => {
    // `always` puts every branch on one line, even through a pipe.
    it('reports the branch exists', () => {
      git('config column.ui always');

      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });
  });

  describe('when no branch is checked out', () => {
    it('reports the branch exists', () => {
      git('checkout -q --detach HEAD');

      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });
  });

  describe('when the branch only exists on the remote', () => {
    it('reports the branch exists', () => {
      const remotePath = path.join(root, 'origin.git');
      execSync(`git init -q --bare "${remotePath}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      git(`remote add origin "${remotePath}"`);
      git('push -q origin feature');
      git('branch -D feature');

      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });
  });

  describe('when every decoration applies at once', () => {
    it('reports the branch exists', () => {
      addWorktreeFor('feature');
      git('config color.ui always');
      git('config column.ui always');
      git('checkout -q --detach HEAD');

      expect(service.branchExists(repoPath, 'feature')).toBe(true);
    });
  });

  describe('when the branch name is misspelled', () => {
    it('reports the branch is unknown', () => {
      expect(service.branchExists(repoPath, 'feaure')).toBe(false);
    });
  });

  describe('when the branch name is empty', () => {
    it('reports the branch is unknown', () => {
      expect(service.branchExists(repoPath, '')).toBe(false);
    });
  });
});
