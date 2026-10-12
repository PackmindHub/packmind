import { decideDistributionTracking } from './distributionTracking';

describe('decideDistributionTracking', () => {
  describe('when the server predates repository tracking', () => {
    it('records unconditionally, the way CLIs did before tracking', () => {
      expect(
        decideDistributionTracking({
          branchExists: () => true,
          detached: false,
          lookup: { status: 'tracking-unsupported' },
          currentBranch: 'main',
        }),
      ).toEqual({ action: 'record-legacy' });
    });
  });

  describe('when tracking is undeterminable', () => {
    it('informs the user', () => {
      expect(
        decideDistributionTracking({
          branchExists: () => true,
          detached: false,
          lookup: { status: 'unavailable' },
          currentBranch: 'main',
        }),
      ).toEqual({ action: 'inform' });
    });
  });

  describe('when the repository is not tracked', () => {
    it('skips with a repo_not_tracked reason', () => {
      expect(
        decideDistributionTracking({
          branchExists: () => true,
          detached: false,
          lookup: { status: 'resolved', trackedGitRepo: null },
          currentBranch: 'main',
        }),
      ).toEqual({ action: 'skip', reason: 'repo_not_tracked' });
    });
  });

  describe('when the current branch is not the tracked branch', () => {
    it('skips with a wrong_branch reason and the tracked branch', () => {
      expect(
        decideDistributionTracking({
          branchExists: () => true,
          detached: false,
          lookup: { status: 'resolved', trackedGitRepo: { branch: 'main' } },
          currentBranch: 'dev',
        }),
      ).toEqual({
        action: 'skip',
        reason: 'wrong_branch',
        trackedBranch: 'main',
      });
    });
  });

  describe('when on the tracked repository and branch', () => {
    it('records the distribution', () => {
      expect(
        decideDistributionTracking({
          branchExists: () => true,
          detached: false,
          lookup: { status: 'resolved', trackedGitRepo: { branch: 'main' } },
          currentBranch: 'main',
        }),
      ).toEqual({ action: 'record' });
    });
  });
});
