import * as path from 'path';
import { GitRunner, GitService } from './GitService';
import { stubLogger } from '@packmind/test-utils';

describe('GitService', () => {
  let gitRunner: jest.MockedFunction<GitRunner>;
  let service: GitService;

  beforeEach(() => {
    gitRunner = jest.fn();
    service = new GitService(stubLogger(), gitRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitRepositoryRoot', () => {
    describe('when path is inside a git repository', () => {
      let result: string;

      beforeEach(() => {
        gitRunner.mockReturnValue({ stdout: '/home/user/project\n' });
        result = service.getGitRepositoryRoot('/home/user/project');
      });

      it('returns repository root path', () => {
        expect(result).toBe('/home/user/project');
      });

      it('calls gitRunner with rev-parse command', () => {
        expect(gitRunner).toHaveBeenCalledWith('rev-parse --show-toplevel', {
          cwd: '/home/user/project',
        });
      });
    });

    describe('when path is a subdirectory', () => {
      let result: string;

      beforeEach(() => {
        gitRunner.mockReturnValue({ stdout: '/home/user/project\n' });
        result = service.getGitRepositoryRoot('/home/user/project/src/main');
      });

      it('returns repository root path', () => {
        expect(result).toBe('/home/user/project');
      });

      it('calls gitRunner with subdirectory as cwd', () => {
        expect(gitRunner).toHaveBeenCalledWith('rev-parse --show-toplevel', {
          cwd: '/home/user/project/src/main',
        });
      });
    });

    describe('when path is not in a git repository', () => {
      it('throws error with descriptive message', () => {
        gitRunner.mockImplementation(() => {
          throw new Error(
            'fatal: not a git repository (or any of the parent directories): .git',
          );
        });

        expect(() => service.getGitRepositoryRoot('/non-git-dir')).toThrow(
          'Failed to get Git repository root',
        );
      });
    });

    describe('when path does not exist', () => {
      it('throws error', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });

        expect(() =>
          service.getGitRepositoryRoot('/non-existent-path'),
        ).toThrow('Failed to get Git repository root');
      });
    });
  });

  describe('tryGetGitRepositoryRoot', () => {
    describe('when path is inside a git repository', () => {
      it('returns repository root path', () => {
        gitRunner.mockReturnValue({ stdout: '/home/user/project\n' });

        const result = service.tryGetGitRepositoryRoot('/home/user/project');

        expect(result).toBe('/home/user/project');
      });
    });

    describe('when path is not in a git repository', () => {
      it('returns null', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('fatal: not a git repository');
        });

        const result = service.tryGetGitRepositoryRoot('/non-git-dir');

        expect(result).toBeNull();
      });
    });

    describe('when path does not exist', () => {
      it('returns null', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });

        const result = service.tryGetGitRepositoryRoot('/non-existent-path');

        expect(result).toBeNull();
      });
    });
  });

  describe('getCurrentBranches', () => {
    describe('when on a single branch', () => {
      let result: ReturnType<typeof service.getCurrentBranches>;

      beforeEach(() => {
        gitRunner.mockReturnValue({
          stdout: '* main\n  remotes/origin/main\n',
        });
        result = service.getCurrentBranches('/repo');
      });

      it('returns the branch name', () => {
        expect(result).toEqual({ branches: ['main'] });
      });

      it('calls gitRunner with branch command', () => {
        expect(gitRunner).toHaveBeenCalledWith('branch -a --contains HEAD', {
          cwd: '/repo',
        });
      });
    });

    describe('when on multiple branches', () => {
      it('returns all unique branch names', () => {
        gitRunner.mockReturnValue({
          stdout:
            '* feature-branch\n  main\n  remotes/origin/feature-branch\n  remotes/origin/main\n',
        });

        const result = service.getCurrentBranches('/repo');

        expect(result.branches.sort()).toEqual(['feature-branch', 'main']);
      });
    });

    describe('when not in a git repository', () => {
      it('throws error', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('fatal: not a git repository');
        });

        expect(() => service.getCurrentBranches('/non-git')).toThrow(
          'Failed to get Git branches',
        );
      });
    });
  });

  describe('getCurrentBranch', () => {
    describe('when on a branch', () => {
      let result: ReturnType<typeof service.getCurrentBranch>;

      beforeEach(() => {
        gitRunner.mockReturnValue({ stdout: 'main\n' });
        result = service.getCurrentBranch('/repo');
      });

      it('returns the current branch name', () => {
        expect(result).toEqual({ branch: 'main' });
      });

      it('calls gitRunner with rev-parse command', () => {
        expect(gitRunner).toHaveBeenCalledWith('rev-parse --abbrev-ref HEAD', {
          cwd: '/repo',
        });
      });
    });

    describe('when on a feature branch', () => {
      it('returns the feature branch name', () => {
        gitRunner.mockReturnValue({ stdout: 'feature/my-feature\n' });

        const result = service.getCurrentBranch('/repo');

        expect(result).toEqual({ branch: 'feature/my-feature' });
      });
    });

    describe('when in detached HEAD state', () => {
      it('returns HEAD', () => {
        gitRunner.mockReturnValue({ stdout: 'HEAD\n' });

        const result = service.getCurrentBranch('/repo');

        expect(result).toEqual({ branch: 'HEAD' });
      });
    });

    describe('when not in a git repository', () => {
      it('throws error', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('fatal: not a git repository');
        });

        expect(() => service.getCurrentBranch('/non-git')).toThrow(
          'Failed to get current Git branch',
        );
      });
    });
  });

  describe('getGitRemoteUrl', () => {
    describe('when only one remote is available', () => {
      let result: ReturnType<typeof service.getGitRemoteUrl>;

      beforeEach(() => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\tgit@github.com:PackmindHub/test-repo.git (fetch)\norigin\tgit@github.com:PackmindHub/test-repo.git (push)\n',
        });
        result = service.getGitRemoteUrl('/repo');
      });

      it('returns single remote', () => {
        expect(result).toEqual({
          gitRemoteUrl: 'git@github.com:PackmindHub/test-repo',
        });
      });

      it('calls gitRunner with remote command', () => {
        expect(gitRunner).toHaveBeenCalledWith('remote -v', { cwd: '/repo' });
      });
    });

    describe('when multiple remotes are available', () => {
      it('returns origin remote by default', () => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\tgit@github.com:PackmindHub/main-repo.git (fetch)\norigin\tgit@github.com:PackmindHub/main-repo.git (push)\nupstream\tgit@github.com:OtherUser/upstream-repo.git (fetch)\nupstream\tgit@github.com:OtherUser/upstream-repo.git (push)\n',
        });

        const result = service.getGitRemoteUrl('/repo');

        expect(result).toEqual({
          gitRemoteUrl: 'git@github.com:PackmindHub/main-repo',
        });
      });
    });

    describe('when origin parameter is provided', () => {
      it('returns specified remote', () => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\tgit@github.com:PackmindHub/main-repo.git (fetch)\norigin\tgit@github.com:PackmindHub/main-repo.git (push)\nupstream\tgit@github.com:OtherUser/upstream-repo.git (fetch)\nupstream\tgit@github.com:OtherUser/upstream-repo.git (push)\n',
        });

        const result = service.getGitRemoteUrl('/repo', 'upstream');

        expect(result).toEqual({
          gitRemoteUrl: 'git@github.com:OtherUser/upstream-repo',
        });
      });
    });

    describe('when there is no origin remote and multiple remotes exist', () => {
      it('throws error', () => {
        gitRunner.mockReturnValue({
          stdout:
            'upstream\tgit@github.com:OtherUser/upstream-repo.git (fetch)\nupstream\tgit@github.com:OtherUser/upstream-repo.git (push)\nfork\tgit@github.com:MyUser/fork-repo.git (fetch)\nfork\tgit@github.com:MyUser/fork-repo.git (push)\n',
        });

        expect(() => service.getGitRemoteUrl('/repo')).toThrow(
          "Multiple remotes found but no 'origin' remote. Please specify the remote name.",
        );
      });
    });

    describe('when specified remote is not found', () => {
      it('throws error', () => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\tgit@github.com:PackmindHub/test-repo.git (fetch)\norigin\tgit@github.com:PackmindHub/test-repo.git (push)\n',
        });

        expect(() => service.getGitRemoteUrl('/repo', 'nonexistent')).toThrow(
          "Remote 'nonexistent' not found in repository",
        );
      });
    });

    describe('when no remotes are found', () => {
      it('throws error', () => {
        gitRunner.mockReturnValue({ stdout: '' });

        expect(() => service.getGitRemoteUrl('/repo')).toThrow(
          'No Git remotes found in the repository',
        );
      });
    });

    describe('with SSH URLs', () => {
      it('preserves SSH URL format and removes .git suffix', () => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\tgit@gitlab.com:company/project.git (fetch)\norigin\tgit@gitlab.com:company/project.git (push)\n',
        });

        const result = service.getGitRemoteUrl('/repo');

        expect(result).toEqual({
          gitRemoteUrl: 'git@gitlab.com:company/project',
        });
      });
    });

    describe('with HTTPS URLs', () => {
      it('preserves HTTPS URL format and removes .git suffix', () => {
        gitRunner.mockReturnValue({
          stdout:
            'origin\thttps://github.com/PackmindHub/test-repo.git (fetch)\norigin\thttps://github.com/PackmindHub/test-repo.git (push)\n',
        });

        const result = service.getGitRemoteUrl('/repo');

        expect(result).toEqual({
          gitRemoteUrl: 'https://github.com/PackmindHub/test-repo',
        });
      });
    });

    describe('when path is not a git repository', () => {
      it('throws error', () => {
        gitRunner.mockImplementation(() => {
          throw new Error('fatal: not a git repository');
        });

        expect(() => service.getGitRemoteUrl('/non-git')).toThrow(
          'Failed to get Git remote URL',
        );
      });
    });
  });

  describe('getModifiedFiles', () => {
    describe('when there are no modified files', () => {
      it('returns empty array', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot
          .mockReturnValueOnce({ stdout: '' }) // git diff --name-only HEAD
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot (for untracked)
          .mockReturnValueOnce({ stdout: '' }); // git ls-files

        const result = service.getModifiedFiles('/repo');

        expect(result).toEqual([]);
      });
    });

    describe('when there are staged modified files', () => {
      it('returns modified file paths', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: 'file.txt\n' })
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: '' });

        const result = service.getModifiedFiles('/repo');

        expect(result).toEqual([path.join('/repo', 'file.txt')]);
      });
    });

    describe('when there are untracked files', () => {
      it('returns untracked file paths', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: '' })
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: 'untracked.txt\n' });

        const result = service.getModifiedFiles('/repo');

        expect(result).toEqual([path.join('/repo', 'untracked.txt')]);
      });
    });

    describe('when there are both modified and untracked files', () => {
      it('returns all file paths', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: 'file.txt\n' })
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: 'untracked.txt\n' });

        const result = service.getModifiedFiles('/repo');

        expect(result.sort()).toEqual([
          path.join('/repo', 'file.txt'),
          path.join('/repo', 'untracked.txt'),
        ]);
      });
    });

    describe('when HEAD does not exist (first commit scenario)', () => {
      it('gets staged files only', () => {
        let callCount = 0;
        gitRunner.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return { stdout: '/repo\n' }; // getGitRepositoryRoot
          if (callCount === 2)
            throw new Error('unknown revision or path not in the working tree');
          if (callCount === 3) return { stdout: 'staged.txt\n' }; // diff --cached
          if (callCount === 4) return { stdout: '/repo\n' }; // getGitRepositoryRoot (for untracked)
          return { stdout: '' }; // git ls-files
        });

        const result = service.getModifiedFiles('/repo');

        expect(result).toEqual([path.join('/repo', 'staged.txt')]);
      });
    });
  });

  describe('getUntrackedFiles', () => {
    describe('when there are no untracked files', () => {
      let result: ReturnType<typeof service.getUntrackedFiles>;

      beforeEach(() => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: '' });
        result = service.getUntrackedFiles('/repo');
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls gitRunner with ls-files command', () => {
        expect(gitRunner).toHaveBeenLastCalledWith(
          'ls-files --others --exclude-standard',
          { cwd: '/repo' },
        );
      });
    });

    describe('when there are untracked files', () => {
      it('returns untracked file paths', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: 'new1.txt\nnew2.txt\n' });

        const result = service.getUntrackedFiles('/repo');

        expect(result.sort()).toEqual([
          path.join('/repo', 'new1.txt'),
          path.join('/repo', 'new2.txt'),
        ]);
      });
    });
  });

  describe('getModifiedLines', () => {
    describe('when there are no modifications', () => {
      it('returns empty array', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot
          .mockReturnValueOnce({ stdout: '' }) // git diff HEAD --unified=0
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot (for untracked)
          .mockReturnValueOnce({ stdout: '' }); // git ls-files

        const result = service.getModifiedLines('/repo');

        expect(result).toEqual([]);
      });
    });

    describe('when there are modified lines in tracked files', () => {
      it('returns modified line ranges', () => {
        const diffOutput = `diff --git a/file.txt b/file.txt
index abc123..def456 100644
--- a/file.txt
+++ b/file.txt
@@ -2 +2 @@ context
-old line
+new line`;

        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: diffOutput })
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: '' });

        const result = service.getModifiedLines('/repo');

        expect(result).toContainEqual({
          file: path.join('/repo', 'file.txt'),
          startLine: 2,
          lineCount: 1,
        });
      });
    });

    describe('when there are added lines', () => {
      it('returns added line ranges', () => {
        const diffOutput = `diff --git a/file.txt b/file.txt
index abc123..def456 100644
--- a/file.txt
+++ b/file.txt
@@ -2,0 +3,2 @@ context
+new1
+new2`;

        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: diffOutput })
          .mockReturnValueOnce({ stdout: '/repo\n' })
          .mockReturnValueOnce({ stdout: '' });

        const result = service.getModifiedLines('/repo');

        expect(result).toContainEqual({
          file: path.join('/repo', 'file.txt'),
          startLine: 3,
          lineCount: 2,
        });
      });
    });

    describe('when there are untracked files', () => {
      it('returns empty', () => {
        gitRunner
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot
          .mockReturnValueOnce({ stdout: '' }) // git diff HEAD --unified=0
          .mockReturnValueOnce({ stdout: '/repo\n' }) // getGitRepositoryRoot (for untracked)
          .mockReturnValueOnce({ stdout: 'untracked.txt\n' }); // git ls-files

        // countFileLines uses execSync for wc -l
        // The file won't exist, so countFileLines returns 0 and no entry is added
        const result = service.getModifiedLines('/repo');

        expect(result).toEqual([]);
      });
    });

    describe('when HEAD does not exist (first commit scenario)', () => {
      it('gets staged diff only', () => {
        const diffOutput = `diff --git a/file.txt b/file.txt
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/file.txt
@@ -0,0 +1,3 @@
+line1
+line2
+line3`;

        let callCount = 0;
        gitRunner.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return { stdout: '/repo\n' }; // getGitRepositoryRoot
          if (callCount === 2) throw new Error('unknown revision');
          if (callCount === 3) return { stdout: diffOutput }; // diff --cached
          if (callCount === 4) return { stdout: '/repo\n' }; // getGitRepositoryRoot (for untracked)
          return { stdout: '' }; // git ls-files
        });

        const result = service.getModifiedLines('/repo');

        expect(result).toContainEqual({
          file: path.join('/repo', 'file.txt'),
          startLine: 1,
          lineCount: 3,
        });
      });
    });
  });
});
