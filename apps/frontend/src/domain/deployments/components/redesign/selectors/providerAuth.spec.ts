import {
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createStandardId,
  createTargetId,
  type GitProviderId,
} from '@packmind/types';

import {
  behindInstallsRequiringCliCount,
  isAppDistributable,
  providersWithTokenSet,
} from './providerAuth';
import type { PackageDrift, RepoRef } from '../types';

function makeRepo(providerId: GitProviderId): RepoRef {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'acme',
    name: 'webapp',
    providerId,
  };
}

describe('providersWithTokenSet', () => {
  describe('when response is undefined', () => {
    it('returns an empty set', () => {
      expect(providersWithTokenSet(undefined).size).toBe(0);
    });
  });

  describe('when some providers have auth and others do not', () => {
    it('returns only the authenticated provider ids', () => {
      const ok = createGitProviderId('prov-ok');
      const off = createGitProviderId('prov-off');
      const set = providersWithTokenSet({
        providers: [
          { id: ok, hasAuth: true },
          { id: off, hasAuth: false },
        ],
      });
      expect(Array.from(set)).toEqual([ok]);
    });
  });
});

describe('isAppDistributable', () => {
  describe('when repo provider is in the authenticated set', () => {
    it('returns true', () => {
      const providerId = createGitProviderId('prov-ok');
      const repo = makeRepo(providerId);
      expect(isAppDistributable(repo, new Set([providerId]))).toBe(true);
    });
  });

  describe('when repo provider is missing from the authenticated set', () => {
    it('returns false', () => {
      const repo = makeRepo(createGitProviderId('prov-off'));
      expect(
        isAppDistributable(repo, new Set([createGitProviderId('prov-ok')])),
      ).toBe(false);
    });
  });
});

describe('behindInstallsRequiringCliCount', () => {
  const PROVIDER_OK = createGitProviderId('prov-ok');
  const PROVIDER_OFF = createGitProviderId('prov-off');

  function makePkg(
    label: string,
    installs: Array<{
      providerId: GitProviderId;
      repoSlug: string;
      target: string;
      drifting: boolean;
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
      lastDistributionStatus: null,
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

  describe('when no install is on an unauthenticated provider', () => {
    it('returns zero', () => {
      const pkg = makePkg('p1', [
        {
          providerId: PROVIDER_OK,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
        },
      ]);
      expect(
        behindInstallsRequiringCliCount([pkg], new Set([PROVIDER_OK])),
      ).toBe(0);
    });
  });

  describe('when a drifted install is on an unauthenticated provider', () => {
    it('counts that install', () => {
      const pkg = makePkg('p1', [
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
      expect(
        behindInstallsRequiringCliCount([pkg], new Set([PROVIDER_OK])),
      ).toBe(1);
    });
  });

  describe('when an aligned install lives on an unauthenticated provider', () => {
    it('does not count it', () => {
      const pkg = makePkg('p1', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r1',
          target: 't1',
          drifting: false,
        },
      ]);
      expect(
        behindInstallsRequiringCliCount([pkg], new Set([PROVIDER_OK])),
      ).toBe(0);
    });
  });

  describe('when the count spans multiple packages', () => {
    it('sums across packages', () => {
      const pkgA = makePkg('A', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r1',
          target: 't1',
          drifting: true,
        },
      ]);
      const pkgB = makePkg('B', [
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r2',
          target: 't1',
          drifting: true,
        },
        {
          providerId: PROVIDER_OFF,
          repoSlug: 'r2',
          target: 't2',
          drifting: true,
        },
      ]);
      expect(
        behindInstallsRequiringCliCount([pkgA, pkgB], new Set([PROVIDER_OK])),
      ).toBe(3);
    });
  });
});
