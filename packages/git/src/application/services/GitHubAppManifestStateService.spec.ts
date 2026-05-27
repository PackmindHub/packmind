import { GitHubAppManifestStateService } from './GitHubAppManifestStateService';
import { stubLogger } from '@packmind/test-utils';

describe('GitHubAppManifestStateService', () => {
  let service: GitHubAppManifestStateService;

  beforeEach(() => {
    service = new GitHubAppManifestStateService(stubLogger());
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('returns a non-empty string token', () => {
      const state = service.issue();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('returns unique tokens across calls', () => {
      const state1 = service.issue();
      const state2 = service.issue();
      expect(state1).not.toBe(state2);
    });
  });

  describe('consume', () => {
    it('returns true when consuming a valid issued state', () => {
      const state = service.issue();
      expect(service.consume(state)).toBe(true);
    });

    it('returns false when consuming an unknown state', () => {
      expect(service.consume('unknown-state-token')).toBe(false);
    });

    it('returns false when consuming the same state twice', () => {
      const state = service.issue();
      service.consume(state);
      expect(service.consume(state)).toBe(false);
    });

    it('returns false when the state has expired', () => {
      jest.useFakeTimers();
      const state = service.issue();

      jest.advanceTimersByTime(11 * 60 * 1000);

      expect(service.consume(state)).toBe(false);
      jest.useRealTimers();
    });
  });
});
