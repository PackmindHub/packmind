import {
  ActiveDistributedPackagesByTarget,
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  DeployedStandardTargetInfo,
  DistributionStatus,
  GitRepo,
  GitRepoId,
  Package,
  Target,
} from '@packmind/types';

import {
  buildRepositoryDriftOverview,
  flattenRepositoryTargetPackages,
  repositoryBehindInstallCount,
  repositoryDriftedTargetCount,
  repositoryHasDrift,
  repositoryHasFailedDistribution,
  repositoryLastActivityAt,
  repositoryLockProfile,
  sortRepositoriesByDriftFirst,
  targetBehindInstallCount,
  totalDriftedRepoCount,
} from './buildRepositoryDriftOverview';

const SPACE_ID = createSpaceId('space-1');
const USER_ID = createUserId('user-1');
const PROVIDER_OK = createGitProviderId('provider-ok');
const PROVIDER_NO_TOKEN = createGitProviderId('provider-no-token');

function makeRepo(overrides?: Partial<GitRepo>): GitRepo {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'acme',
    repo: 'webapp',
    branch: 'main',
    providerId: PROVIDER_OK,
    ...overrides,
  };
}

function makeTarget(overrides?: Partial<Target>): Target {
  const id = createTargetId(overrides?.name ?? 'target-root');
  return {
    id,
    name: 'root',
    path: '/',
    gitRepoId: createGitRepoId('repo-1'),
    ...overrides,
  };
}

function makePackage(overrides?: Partial<Package>): Package {
  return {
    id: createPackageId('pkg-1'),
    name: 'Frontend',
    slug: 'frontend',
    description: 'Frontend package',
    spaceId: SPACE_ID,
    createdBy: USER_ID,
    recipes: [],
    standards: [],
    skills: [],
    ...overrides,
  };
}

function makeStandardInfo(opts: {
  id?: string;
  latest: number;
  deployed: number;
  deploymentDate?: string;
}): DeployedStandardTargetInfo {
  const standardId = createStandardId(opts.id ?? 'std-1');
  return {
    standard: {
      id: standardId,
      name: 'Naming',
      slug: 'naming',
      description: '',
      version: opts.latest,
      gitCommit: undefined,
      userId: USER_ID,
      scope: null,
      spaceId: SPACE_ID,
      movedTo: null,
    },
    latestVersion: {
      id: createStandardVersionId('sv-latest'),
      standardId,
      name: 'Naming',
      slug: 'naming',
      description: '',
      version: opts.latest,
      scope: null,
    },
    deployedVersion: {
      id: createStandardVersionId('sv-deployed'),
      standardId,
      name: 'Naming',
      slug: 'naming',
      description: '',
      version: opts.deployed,
      scope: null,
    },
    isUpToDate: opts.deployed >= opts.latest,
    deploymentDate: opts.deploymentDate ?? '2026-01-01T00:00:00Z',
  };
}

function makeByTargetEntry(opts: {
  repo: GitRepo;
  target: Target;
  packageId?: string;
  packageName?: string;
  deployedStandards?: DeployedStandardTargetInfo[];
  lastDistributionStatus?: DistributionStatus;
  lastDistributedAt?: string;
}): ActiveDistributedPackagesByTarget {
  const pkgId = createPackageId(opts.packageId ?? 'pkg-1');
  return {
    targetId: opts.target.id,
    target: opts.target,
    gitRepo: opts.repo,
    packages: [
      {
        packageId: pkgId,
        package: makePackage({
          id: pkgId,
          name: opts.packageName ?? 'Frontend',
        }),
        lastDistributionStatus:
          opts.lastDistributionStatus ?? DistributionStatus.success,
        lastDistributedAt: opts.lastDistributedAt ?? '2026-01-01T00:00:00Z',
        deployedRecipes: [],
        deployedStandards: opts.deployedStandards ?? [],
        deployedSkills: [],
        pendingRecipes: [],
        pendingStandards: [],
        pendingSkills: [],
      },
    ],
  };
}

describe('buildRepositoryDriftOverview', () => {
  describe('when two targets belong to the same git repo', () => {
    it('groups them under a single RepositoryDrift', () => {
      const repo = makeRepo();
      const targetA = makeTarget({
        id: createTargetId('t-a'),
        name: 'root',
        path: '/',
      });
      const targetB = makeTarget({
        id: createTargetId('t-b'),
        name: 'web',
        path: '/web',
      });

      const repos = buildRepositoryDriftOverview([
        makeByTargetEntry({ repo, target: targetA }),
        makeByTargetEntry({ repo, target: targetB }),
      ]);

      expect(repos).toHaveLength(1);
    });

    it('exposes both targets sorted with default-target first', () => {
      const repo = makeRepo();
      const targetWeb = makeTarget({
        id: createTargetId('t-web'),
        name: 'web',
        path: '/web',
      });
      const targetRoot = makeTarget({
        id: createTargetId('t-root'),
        name: 'root',
        path: '/',
      });

      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({ repo, target: targetWeb }),
        makeByTargetEntry({ repo, target: targetRoot }),
      ]);

      expect(r.targets.map((t) => t.target.name)).toEqual(['root', 'web']);
    });
  });

  describe('when two repos exist', () => {
    it('emits one RepositoryDrift per gitRepo.id', () => {
      const repoA = makeRepo({ id: createGitRepoId('r-a'), repo: 'a' });
      const repoB = makeRepo({ id: createGitRepoId('r-b'), repo: 'b' });

      const repos = buildRepositoryDriftOverview([
        makeByTargetEntry({ repo: repoA, target: makeTarget() }),
        makeByTargetEntry({ repo: repoB, target: makeTarget() }),
      ]);

      expect(repos.map((r) => r.repo.name)).toEqual(['a', 'b']);
    });
  });

  describe('when an entry has no gitRepo', () => {
    it('skips the entry entirely', () => {
      const repos = buildRepositoryDriftOverview([
        {
          ...makeByTargetEntry({ repo: makeRepo(), target: makeTarget() }),
          gitRepo: null,
        },
      ]);

      expect(repos).toEqual([]);
    });
  });
});

describe('drift detection on a repository', () => {
  function buildSingleStandardRepo(opts: {
    latest: number;
    deployed: number;
    lastStatus?: DistributionStatus;
    providerId?: GitRepo['providerId'];
  }): ActiveDistributedPackagesByTarget {
    const repo = makeRepo({
      providerId: opts.providerId ?? PROVIDER_OK,
    });
    return makeByTargetEntry({
      repo,
      target: makeTarget(),
      deployedStandards: [
        makeStandardInfo({ latest: opts.latest, deployed: opts.deployed }),
      ],
      lastDistributionStatus: opts.lastStatus,
    });
  }

  describe('when an artifact version is behind', () => {
    it('flags drift', () => {
      const [r] = buildRepositoryDriftOverview([
        buildSingleStandardRepo({ latest: 3, deployed: 1 }),
      ]);

      expect(repositoryHasDrift(r)).toBe(true);
    });

    it('reports the number of drifted (target, package) pairs', () => {
      const [r] = buildRepositoryDriftOverview([
        buildSingleStandardRepo({ latest: 3, deployed: 1 }),
      ]);

      expect(repositoryBehindInstallCount(r)).toBe(1);
    });
  });

  describe('when the artifact is aligned', () => {
    it('does not flag drift', () => {
      const [r] = buildRepositoryDriftOverview([
        buildSingleStandardRepo({ latest: 2, deployed: 2 }),
      ]);

      expect(repositoryHasDrift(r)).toBe(false);
    });
  });

  it('reports the number of drifted targets', () => {
    const repo = makeRepo();
    const targetA = makeTarget({
      id: createTargetId('t-a'),
      name: 'root',
      path: '/',
    });
    const targetB = makeTarget({
      id: createTargetId('t-b'),
      name: 'web',
      path: '/web',
    });
    const [r] = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo,
        target: targetA,
        deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
      }),
      makeByTargetEntry({
        repo,
        target: targetB,
        deployedStandards: [makeStandardInfo({ latest: 2, deployed: 2 })],
      }),
    ]);

    expect(repositoryDriftedTargetCount(r)).toBe(1);
  });

  it('counts the drifted (target, package) pairs across targets', () => {
    const repo = makeRepo();
    const targetA = makeTarget({
      id: createTargetId('t-a'),
      name: 'root',
      path: '/',
    });
    const targetB = makeTarget({
      id: createTargetId('t-b'),
      name: 'web',
      path: '/web',
    });
    const [r] = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo,
        target: targetA,
        deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
      }),
      makeByTargetEntry({
        repo,
        target: targetB,
        packageId: 'pkg-2',
        deployedStandards: [
          makeStandardInfo({ id: 'std-2', latest: 4, deployed: 1 }),
        ],
      }),
    ]);

    expect(repositoryBehindInstallCount(r)).toBe(2);
  });

  it('exposes the per-target behind install count', () => {
    const repo = makeRepo();
    const [r] = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo,
        target: makeTarget(),
        deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
      }),
    ]);

    expect(targetBehindInstallCount(r.targets[0])).toBe(1);
  });
});

describe('failure detection on a repository', () => {
  describe('when the last distribution status is failure', () => {
    it('flags failure', () => {
      const repo = makeRepo();
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo,
          target: makeTarget(),
          lastDistributionStatus: DistributionStatus.failure,
        }),
      ]);

      expect(repositoryHasFailedDistribution(r)).toBe(true);
    });
  });

  describe('when the last distribution succeeded', () => {
    it('does not flag failure', () => {
      const repo = makeRepo();
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo,
          target: makeTarget(),
          lastDistributionStatus: DistributionStatus.success,
        }),
      ]);

      expect(repositoryHasFailedDistribution(r)).toBe(false);
    });
  });
});

describe('sortRepositoriesByDriftFirst', () => {
  it('orders failed repos before drifted repos and aligned repos last', () => {
    const drifted = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo: makeRepo({ id: createGitRepoId('r-drift'), repo: 'drifted' }),
        target: makeTarget(),
        deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
      }),
    ])[0];
    const failed = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo: makeRepo({ id: createGitRepoId('r-fail'), repo: 'failed' }),
        target: makeTarget(),
        lastDistributionStatus: DistributionStatus.failure,
      }),
    ])[0];
    const aligned = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo: makeRepo({ id: createGitRepoId('r-ok'), repo: 'aligned' }),
        target: makeTarget(),
      }),
    ])[0];

    const sorted = sortRepositoriesByDriftFirst([aligned, drifted, failed]);

    expect(sorted.map((r) => r.repo.name)).toEqual([
      'failed',
      'drifted',
      'aligned',
    ]);
  });
});

describe('totalDriftedRepoCount', () => {
  it('counts every repo that has at least one drifted target', () => {
    const drifted = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo: makeRepo({ id: createGitRepoId('r-1'), repo: 'one' }),
        target: makeTarget(),
        deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
      }),
    ])[0];
    const aligned = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo: makeRepo({ id: createGitRepoId('r-2'), repo: 'two' }),
        target: makeTarget(),
      }),
    ])[0];

    expect(totalDriftedRepoCount([drifted, aligned])).toBe(1);
  });
});

describe('repositoryLockProfile', () => {
  describe('when the repo has no drift', () => {
    it('returns none', () => {
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo: makeRepo(),
          target: makeTarget(),
        }),
      ]);

      const profile = repositoryLockProfile(r, new Set([PROVIDER_OK]), false);

      expect(profile).toBe('none');
    });
  });

  describe('when the repo provider has no token', () => {
    it('returns all-no-app-token', () => {
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo: makeRepo({ providerId: PROVIDER_NO_TOKEN }),
          target: makeTarget(),
          deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
        }),
      ]);

      const profile = repositoryLockProfile(r, new Set([PROVIDER_OK]), false);

      expect(profile).toBe('all-no-app-token');
    });
  });

  describe('when every drifted install is in progress', () => {
    it('returns all-in-progress', () => {
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo: makeRepo(),
          target: makeTarget(),
          deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
          lastDistributionStatus: DistributionStatus.in_progress,
        }),
      ]);

      const profile = repositoryLockProfile(r, new Set([PROVIDER_OK]), false);

      expect(profile).toBe('all-in-progress');
    });
  });

  describe('when providers are still loading', () => {
    it('returns none to avoid flashing a stale lock', () => {
      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({
          repo: makeRepo({ providerId: PROVIDER_NO_TOKEN }),
          target: makeTarget(),
          deployedStandards: [makeStandardInfo({ latest: 3, deployed: 1 })],
        }),
      ]);

      const profile = repositoryLockProfile(r, new Set(), true);

      expect(profile).toBe('none');
    });
  });
});

describe('repositoryLastActivityAt', () => {
  it('returns the most recent lastDistributedAt across all installs', () => {
    const repo = makeRepo();
    const [r] = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo,
        target: makeTarget({
          id: createTargetId('t-a'),
          name: 'root',
          path: '/',
        }),
        lastDistributedAt: '2026-02-01T00:00:00Z',
      }),
      makeByTargetEntry({
        repo,
        target: makeTarget({
          id: createTargetId('t-b'),
          name: 'web',
          path: '/web',
        }),
        lastDistributedAt: '2026-03-01T00:00:00Z',
      }),
    ]);

    expect(repositoryLastActivityAt(r)).toBe('2026-03-01T00:00:00Z');
  });
});

describe('flattenRepositoryTargetPackages', () => {
  it('emits one entry per (target, package) pair', () => {
    const repo = makeRepo();
    const [r] = buildRepositoryDriftOverview([
      makeByTargetEntry({
        repo,
        target: makeTarget({
          id: createTargetId('t-a'),
          name: 'root',
          path: '/',
        }),
      }),
      makeByTargetEntry({
        repo,
        target: makeTarget({
          id: createTargetId('t-b'),
          name: 'web',
          path: '/web',
        }),
        packageId: 'pkg-2',
        packageName: 'Backend',
      }),
    ]);

    const flat = flattenRepositoryTargetPackages(r);

    expect(flat.map((e) => `${e.target.name}/${e.pkg.name}`)).toEqual([
      'root/Frontend',
      'web/Backend',
    ]);
  });
});

describe('repos with disconnected branches', () => {
  describe('when two entries share gitRepo.id but differ on branch', () => {
    it('keeps the branch of the first entry on the resulting repo', () => {
      const sharedId: GitRepoId = createGitRepoId('repo-shared');
      const repoMain = makeRepo({ id: sharedId, branch: 'main' });
      const repoRelease = makeRepo({ id: sharedId, branch: 'release/2.0' });

      const [r] = buildRepositoryDriftOverview([
        makeByTargetEntry({ repo: repoMain, target: makeTarget() }),
        makeByTargetEntry({ repo: repoRelease, target: makeTarget() }),
      ]);

      expect(r.branch).toBe('main');
    });
  });
});
