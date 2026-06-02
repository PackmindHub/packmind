import {
  MARKETPLACE_SYNC_BRANCH,
  MARKETPLACE_SYNC_PR_TITLE,
} from './marketplaceSyncPullRequest';

describe('marketplaceSyncPullRequest constants', () => {
  describe('MARKETPLACE_SYNC_PR_TITLE', () => {
    it('exposes the verbatim title "Packmind sync"', () => {
      expect(MARKETPLACE_SYNC_PR_TITLE).toBe('Packmind sync');
    });
  });

  describe('MARKETPLACE_SYNC_BRANCH', () => {
    it('exposes the verbatim branch "packmind/sync"', () => {
      expect(MARKETPLACE_SYNC_BRANCH).toBe('packmind/sync');
    });
  });
});
