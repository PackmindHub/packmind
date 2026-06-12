import {
  DistributionStatus,
  createGitProviderId,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';

import { installLockReason } from './installLock';
import type { InstallDriftEntry } from './installDriftEntries';

const PROVIDER_OK = createGitProviderId('prov-ok');
const PROVIDER_OFF = createGitProviderId('prov-off');

function makeEntry(
  overrides: Partial<InstallDriftEntry> & {
    providerId?: ReturnType<typeof createGitProviderId>;
  } = {},
): InstallDriftEntry {
  const providerId = overrides.providerId ?? PROVIDER_OK;
  return {
    repo: {
      id: createGitRepoId('repo-1'),
      owner: 'acme',
      name: 'webapp',
      providerId,
    },
    target: { id: createTargetId('target-1'), name: 'root', isDefault: true },
    branch: 'main',
    mostRecentDeployedAt: null,
    mostRecentDeployedAtDays: Number.POSITIVE_INFINITY,
    lastDistributionStatus: null,
    lastDistributedAt: null,
    behindArtifacts: [],
    alignedArtifactCount: 0,
    ...overrides,
  };
}

describe('installLockReason', () => {
  describe('when distribution is in progress', () => {
    it('returns in-progress regardless of provider auth', () => {
      const entry = makeEntry({
        lastDistributionStatus: DistributionStatus.in_progress,
        providerId: PROVIDER_OFF,
      });
      expect(installLockReason(entry, new Set([PROVIDER_OK]), false)).toBe(
        'in-progress',
      );
    });
  });

  describe('when provider has no token', () => {
    it('returns no-app-token', () => {
      const entry = makeEntry({ providerId: PROVIDER_OFF });
      expect(installLockReason(entry, new Set([PROVIDER_OK]), false)).toBe(
        'no-app-token',
      );
    });
  });

  describe('when providers list is still loading', () => {
    it('does not lock for missing token', () => {
      const entry = makeEntry({ providerId: PROVIDER_OFF });
      expect(installLockReason(entry, new Set(), true)).toBeNull();
    });
  });

  describe('when provider has a token and nothing is running', () => {
    it('returns null', () => {
      const entry = makeEntry({ providerId: PROVIDER_OK });
      expect(
        installLockReason(entry, new Set([PROVIDER_OK]), false),
      ).toBeNull();
    });
  });
});
