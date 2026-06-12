import {
  DistributionStatus,
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createStandardId,
  createTargetId,
  type GitProviderId,
} from '@packmind/types';

import { installLockReason, packageLockProfile } from './installLock';
import type { InstallDriftEntry } from './installDriftEntries';
import type { PackageDrift } from '../types';

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

describe('packageLockProfile', () => {
  const PROVIDER_OK = createGitProviderId('prov-ok');
  const PROVIDER_OFF = createGitProviderId('prov-off');

  function makePkg(
    label: string,
    installs: Array<{
      providerId: GitProviderId;
      repoSlug: string;
      target: string;
      drifting: boolean;
      status?: DistributionStatus;
    }>,
  ): PackageDrift {
    const artifactId = createStandardId(`std-${label}`);
    const installLocations = installs.map((i) => ({
      repo: {
        id: createGitRepoId(i.repoSlug),
        owner: 'acme',
        name: i.repoSlug,
        providerId: i.providerId,
      },
      target: { id: createTargetId(i.target), name: i.target, isDefault: true },
      branch: 'main',
      lastDistributionStatus: i.status ?? null,
      lastDistributedAt: null,
    }));
    return {
      id: createPackageId(`pkg-${label}`),
      name: label,
      description: '',
      installLocations,
      artifacts: [
        {
          id: artifactId,
          kind: 'standard',
          name: label,
          packmindVersion: 2,
          isDeleted: false,
          isPending: false,
          installs: installs.map((i, idx) => ({
            repo: installLocations[idx].repo,
            target: installLocations[idx].target,
            branch: 'main',
            deployedVersion: i.drifting ? 1 : 2,
            lastDeployedAt: '2026-01-01T00:00:00.000Z',
            driftReason: i.drifting ? 'behind' : 'aligned',
          })),
        },
      ],
    };
  }

  describe('when every drifted install is on an unauthenticated provider', () => {
    it('returns all-no-app-token', () => {
      const pkg = makePkg('p', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
        },
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r2',
          target: 't1',
          drifting: true,
        },
      ]);
      expect(packageLockProfile(pkg, new Set([PROVIDER_OK]), false)).toBe(
        'all-no-app-token',
      );
    });
  });

  describe('when every drifted install is mid-distribution', () => {
    it('returns all-in-progress', () => {
      const pkg = makePkg('p', [
        {
          providerId: PROVIDER_OK,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
          status: DistributionStatus.in_progress,
        },
      ]);
      expect(packageLockProfile(pkg, new Set([PROVIDER_OK]), false)).toBe(
        'all-in-progress',
      );
    });
  });

  describe('when at least one drifted install is actionable', () => {
    it('returns none', () => {
      const pkg = makePkg('p', [
        {
          providerId: PROVIDER_OK,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
        },
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r2',
          target: 't1',
          drifting: true,
        },
      ]);
      expect(packageLockProfile(pkg, new Set([PROVIDER_OK]), false)).toBe(
        'none',
      );
    });
  });

  describe('when the package has no drift', () => {
    it('returns none', () => {
      const pkg = makePkg('p', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r1',
          target: 't1',
          drifting: false,
        },
      ]);
      expect(packageLockProfile(pkg, new Set([PROVIDER_OK]), false)).toBe(
        'none',
      );
    });
  });

  describe('when providers are still loading', () => {
    it('returns none even if installs look CLI-only', () => {
      const pkg = makePkg('p', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
        },
      ]);
      expect(packageLockProfile(pkg, new Set(), true)).toBe('none');
    });
  });
});
