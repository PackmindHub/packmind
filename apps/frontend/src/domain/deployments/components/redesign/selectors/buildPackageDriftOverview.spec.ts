import {
  ActiveDistributedPackagesByTarget,
  createGitProviderId,
  createGitRepoId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  DeployedRecipeTargetInfo,
  DeployedSkillTargetInfo,
  DeployedStandardTargetInfo,
  DistributionStatus,
  GitRepo,
  Package,
  PendingRecipeInfo,
  PendingSkillInfo,
  PendingStandardInfo,
  Target,
} from '@packmind/types';

import {
  buildPackageDriftOverview,
  packageFailedInstallCount,
  packageHasDrift,
  packageHasFailedDistribution,
  sortPackagesByDriftFirst,
  totalBehindInstallCount,
  totalFailedInstallCount,
} from './buildPackageDriftOverview';
import type { PackageDrift } from '../types';

const SPACE_ID = createSpaceId('space-1');
const USER_ID = createUserId('user-1');

const PROVIDER_ID = createGitProviderId('provider-1');

function makeRepo(overrides?: Partial<GitRepo>): GitRepo {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'acme',
    repo: 'webapp',
    branch: 'main',
    providerId: PROVIDER_ID,
    ...overrides,
  };
}

function makeTarget(overrides?: Partial<Target>): Target {
  return {
    id: createTargetId('target-root'),
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
  name?: string;
  latest: number;
  deployed: number;
  deploymentDate?: string;
  isDeleted?: boolean;
}): DeployedStandardTargetInfo {
  const standardId = createStandardId(opts.id ?? 'std-1');
  return {
    standard: {
      id: standardId,
      name: opts.name ?? 'Naming conventions',
      slug: 'naming-conventions',
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
      name: opts.name ?? 'Naming conventions',
      slug: 'naming-conventions',
      description: '',
      version: opts.latest,
      scope: null,
    },
    deployedVersion: {
      id: createStandardVersionId('sv-deployed'),
      standardId,
      name: opts.name ?? 'Naming conventions',
      slug: 'naming-conventions',
      description: '',
      version: opts.deployed,
      scope: null,
    },
    isUpToDate: opts.deployed >= opts.latest,
    deploymentDate: opts.deploymentDate ?? '2026-01-01T00:00:00Z',
    isDeleted: opts.isDeleted,
  };
}

function makeRecipeInfo(opts: {
  id?: string;
  name?: string;
  latest: number;
  deployed: number;
}): DeployedRecipeTargetInfo {
  const recipeId = createRecipeId(opts.id ?? 'rcp-1');
  return {
    recipe: {
      id: recipeId,
      name: opts.name ?? 'Release recipe',
      slug: 'release-recipe',
      content: '',
      version: opts.latest,
      gitCommit: undefined,
      userId: USER_ID,
      spaceId: SPACE_ID,
      movedTo: null,
    },
    latestVersion: {
      id: createRecipeVersionId('rv-latest'),
      recipeId,
      name: opts.name ?? 'Release recipe',
      slug: 'release-recipe',
      content: '',
      version: opts.latest,
      userId: USER_ID,
    },
    deployedVersion: {
      id: createRecipeVersionId('rv-deployed'),
      recipeId,
      name: opts.name ?? 'Release recipe',
      slug: 'release-recipe',
      content: '',
      version: opts.deployed,
      userId: USER_ID,
    },
    isUpToDate: opts.deployed >= opts.latest,
    deploymentDate: '2026-01-01T00:00:00Z',
  };
}

function makeSkillInfo(opts: {
  id?: string;
  name?: string;
  latest: number;
  deployed: number;
}): DeployedSkillTargetInfo {
  const skillId = createSkillId(opts.id ?? 'skl-1');
  return {
    skill: {
      id: skillId,
      name: opts.name ?? 'Code review skill',
      slug: 'code-review',
      description: '',
      prompt: '',
      version: opts.latest,
      userId: USER_ID,
      spaceId: SPACE_ID,
      movedTo: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    latestVersion: {
      id: createSkillVersionId('skv-latest'),
      skillId,
      version: opts.latest,
      userId: USER_ID,
      name: opts.name ?? 'Code review skill',
      slug: 'code-review',
      description: '',
      prompt: '',
    },
    deployedVersion: {
      id: createSkillVersionId('skv-deployed'),
      skillId,
      version: opts.deployed,
      userId: USER_ID,
      name: opts.name ?? 'Code review skill',
      slug: 'code-review',
      description: '',
      prompt: '',
    },
    isUpToDate: opts.deployed >= opts.latest,
    deploymentDate: '2026-01-01T00:00:00Z',
  };
}

function makePendingStandard(opts: {
  id?: string;
  name?: string;
}): PendingStandardInfo {
  return {
    id: createStandardId(opts.id ?? 'std-pending'),
    name: opts.name ?? 'Pending standard',
    slug: 'pending-standard',
  };
}

function makePendingRecipe(opts: {
  id?: string;
  name?: string;
}): PendingRecipeInfo {
  return {
    id: createRecipeId(opts.id ?? 'rcp-pending'),
    name: opts.name ?? 'Pending recipe',
    slug: 'pending-recipe',
  };
}

function makePendingSkill(opts: {
  id?: string;
  name?: string;
}): PendingSkillInfo {
  return {
    id: createSkillId(opts.id ?? 'skl-pending'),
    name: opts.name ?? 'Pending skill',
    slug: 'pending-skill',
  };
}

function makeByTarget(
  overrides: Partial<ActiveDistributedPackagesByTarget>,
): ActiveDistributedPackagesByTarget {
  return {
    targetId: createTargetId('target-root'),
    target: makeTarget(),
    gitRepo: makeRepo(),
    packages: [],
    ...overrides,
  };
}

function distributedPackage(opts: {
  packageId?: string;
  packageOverrides?: Partial<Package>;
  lastDistributionStatus?: DistributionStatus;
  lastDistributedAt?: string;
  standards?: DeployedStandardTargetInfo[];
  recipes?: DeployedRecipeTargetInfo[];
  skills?: DeployedSkillTargetInfo[];
  pendingStandards?: PendingStandardInfo[];
  pendingRecipes?: PendingRecipeInfo[];
  pendingSkills?: PendingSkillInfo[];
}) {
  const packageId = createPackageId(opts.packageId ?? 'pkg-1');
  return {
    packageId,
    package: makePackage({ id: packageId, ...opts.packageOverrides }),
    lastDistributionStatus:
      opts.lastDistributionStatus ?? DistributionStatus.success,
    lastDistributedAt: opts.lastDistributedAt ?? '2026-01-01T00:00:00Z',
    deployedStandards: opts.standards ?? [],
    deployedRecipes: opts.recipes ?? [],
    deployedSkills: opts.skills ?? [],
    pendingRecipes: opts.pendingRecipes ?? [],
    pendingStandards: opts.pendingStandards ?? [],
    pendingSkills: opts.pendingSkills ?? [],
  };
}

describe('buildPackageDriftOverview', () => {
  describe('when no targets are provided', () => {
    it('returns an empty array', () => {
      expect(buildPackageDriftOverview([])).toEqual([]);
    });
  });

  describe('when a single target deploys a drifted standard', () => {
    let result: PackageDrift[];
    let pkg: PackageDrift;

    beforeEach(() => {
      result = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 3, deployed: 2 })],
            }),
          ],
        }),
      ]);
      pkg = result[0];
    });

    it('returns one package entry', () => {
      expect(result).toHaveLength(1);
    });

    it('exposes the package id', () => {
      expect(pkg.id).toBe('pkg-1');
    });

    it('exposes the package name', () => {
      expect(pkg.name).toBe('Frontend');
    });

    it('exposes one artifact entry', () => {
      expect(pkg.artifacts).toHaveLength(1);
    });

    it('uses the latest version as packmindVersion', () => {
      expect(pkg.artifacts[0]).toMatchObject({
        kind: 'standard',
        packmindVersion: 3,
      });
    });

    it('records the deployed version per install', () => {
      expect(pkg.artifacts[0].installs[0].deployedVersion).toBe(2);
    });

    it('flags the install as behind', () => {
      expect(pkg.artifacts[0].installs[0].driftReason).toBe('behind');
    });

    it('records the install location', () => {
      expect(pkg.installLocations).toHaveLength(1);
    });
  });

  describe('when the same package is deployed across two targets', () => {
    let pkg: PackageDrift;

    beforeEach(() => {
      const repoA = makeRepo({ id: createGitRepoId('repo-a'), repo: 'a' });
      const repoB = makeRepo({ id: createGitRepoId('repo-b'), repo: 'b' });
      const [first] = buildPackageDriftOverview([
        makeByTarget({
          targetId: createTargetId('t-a'),
          target: makeTarget({ id: createTargetId('t-a'), name: 'root' }),
          gitRepo: repoA,
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 4, deployed: 4 })],
            }),
          ],
        }),
        makeByTarget({
          targetId: createTargetId('t-b'),
          target: makeTarget({
            id: createTargetId('t-b'),
            name: 'subdir',
            path: 'sub',
          }),
          gitRepo: repoB,
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 4, deployed: 2 })],
            }),
          ],
        }),
      ]);
      pkg = first;
    });

    it('merges install locations from both targets', () => {
      expect(pkg.installLocations).toHaveLength(2);
    });

    it('deduplicates the artifact across targets', () => {
      expect(pkg.artifacts).toHaveLength(1);
    });

    it('keeps per-install deployed versions', () => {
      expect(
        pkg.artifacts[0].installs.map((i) => i.deployedVersion).sort(),
      ).toEqual([2, 4]);
    });
  });

  describe('when a target path is not the repo root', () => {
    it('flags the target as non-default', () => {
      const result = buildPackageDriftOverview([
        makeByTarget({
          target: makeTarget({
            id: createTargetId('t-sub'),
            path: 'apps/web',
            name: 'web',
          }),
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);
      expect(result[0].installLocations[0].target.isDefault).toBe(false);
    });
  });

  describe('when an artifact is marked as deleted', () => {
    let pkg: PackageDrift;
    let dead: PackageDrift['artifacts'][number];

    beforeEach(() => {
      const [first] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [
                makeStandardInfo({ id: 'alive', latest: 1, deployed: 1 }),
                makeStandardInfo({
                  id: 'dead',
                  latest: 2,
                  deployed: 1,
                  isDeleted: true,
                }),
              ],
            }),
          ],
        }),
      ]);
      pkg = first;
      const found = pkg.artifacts.find((a) => a.id === 'dead');
      if (!found) throw new Error('deleted artifact missing from output');
      dead = found;
    });

    it('keeps the deleted artifact in the result', () => {
      expect(pkg.artifacts).toHaveLength(2);
    });

    it('flags the deleted artifact', () => {
      expect(dead.isDeleted).toBe(true);
    });

    it('marks the install as needs-removal', () => {
      expect(dead.installs[0].driftReason).toBe('needs-removal');
    });
  });

  describe('when an artifact is pending distribution', () => {
    let pkg: PackageDrift;
    let pending: PackageDrift['artifacts'][number];

    beforeEach(() => {
      const [first] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
              pendingRecipes: [
                makePendingRecipe({ id: 'pend-rcp', name: 'New recipe' }),
              ],
            }),
          ],
        }),
      ]);
      pkg = first;
      const found = pkg.artifacts.find((a) => a.id === 'pend-rcp');
      if (!found) throw new Error('pending artifact missing from output');
      pending = found;
    });

    it('adds an artifact entry for the pending recipe', () => {
      expect(pending.kind).toBe('command');
    });

    it('flags the artifact as pending', () => {
      expect(pending.isPending).toBe(true);
    });

    it('records one install per package location with not-distributed reason', () => {
      expect(pending.installs[0].driftReason).toBe('not-distributed');
    });

    it('leaves the deployed version at zero for the pending install', () => {
      expect(pending.installs[0].deployedVersion).toBe(0);
    });
  });

  describe('when a target has no git repo', () => {
    it('drops the target entirely', () => {
      const result = buildPackageDriftOverview([
        makeByTarget({
          gitRepo: null,
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);
      expect(result).toEqual([]);
    });
  });

  describe('when standards, recipes and skills are mixed', () => {
    it('orders artifacts standard → command → skill', () => {
      const result = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
              recipes: [makeRecipeInfo({ latest: 2, deployed: 1 })],
              skills: [makeSkillInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(result[0].artifacts.map((a) => a.kind)).toEqual([
        'standard',
        'command',
        'skill',
      ]);
    });
  });

  describe('when the package distribution status is failure', () => {
    it('captures the status on the install location', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.failure,
              lastDistributedAt: '2026-05-01T10:00:00Z',
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);
      expect(pkg.installLocations[0].lastDistributionStatus).toBe(
        DistributionStatus.failure,
      );
    });
  });

  describe('when the package distribution timestamp is captured', () => {
    it('exposes the distribution date on the install location', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              lastDistributedAt: '2026-05-01T10:00:00Z',
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);
      expect(pkg.installLocations[0].lastDistributedAt).toBe(
        '2026-05-01T10:00:00Z',
      );
    });
  });
});

describe('packageHasDrift', () => {
  describe('when any install is behind the packmind version', () => {
    it('returns true', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 3, deployed: 2 })],
            }),
          ],
        }),
      ]);
      expect(packageHasDrift(pkg)).toBe(true);
    });
  });

  describe('when every install matches the packmind version', () => {
    it('returns false', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 3, deployed: 3 })],
            }),
          ],
        }),
      ]);
      expect(packageHasDrift(pkg)).toBe(false);
    });
  });

  describe('when only a deleted artifact remains on the repo', () => {
    it('reports drift so the removal can be propagated', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [
                makeStandardInfo({
                  latest: 2,
                  deployed: 2,
                  isDeleted: true,
                }),
              ],
            }),
          ],
        }),
      ]);
      expect(packageHasDrift(pkg)).toBe(true);
    });
  });

  describe('when a pending artifact has never been distributed', () => {
    it('reports drift so the artifact can be pushed', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
              pendingSkills: [makePendingSkill({ id: 'p-sk' })],
            }),
          ],
        }),
      ]);
      expect(packageHasDrift(pkg)).toBe(true);
    });
  });
});

describe('totalBehindInstallCount', () => {
  describe('when multiple artifacts drift on the same install', () => {
    it('counts the install once', () => {
      const packages = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 3, deployed: 2 })],
              recipes: [makeRecipeInfo({ latest: 2, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(totalBehindInstallCount(packages)).toBe(1);
    });
  });

  describe('when a pending artifact drifts on the only install', () => {
    it('counts the install once', () => {
      const packages = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
              pendingStandards: [makePendingStandard({ id: 'p-st' })],
            }),
          ],
        }),
      ]);

      expect(totalBehindInstallCount(packages)).toBe(1);
    });
  });
});

describe('packageHasFailedDistribution', () => {
  describe('when no install has a failure status', () => {
    it('returns false', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.success,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(packageHasFailedDistribution(pkg)).toBe(false);
    });
  });

  describe('when at least one install has failure status', () => {
    it('returns true', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-a') }),
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.success,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-b') }),
          target: makeTarget({ id: createTargetId('target-b') }),
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.failure,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(packageHasFailedDistribution(pkg)).toBe(true);
    });
  });
});

describe('packageFailedInstallCount', () => {
  describe('when multiple installs failed', () => {
    it('counts each failed install location', () => {
      const [pkg] = buildPackageDriftOverview([
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-a') }),
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.failure,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-b') }),
          target: makeTarget({ id: createTargetId('target-b') }),
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.success,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-c') }),
          target: makeTarget({ id: createTargetId('target-c') }),
          packages: [
            distributedPackage({
              lastDistributionStatus: DistributionStatus.failure,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(packageFailedInstallCount(pkg)).toBe(2);
    });
  });
});

describe('totalFailedInstallCount', () => {
  describe('when packages have a mix of statuses', () => {
    it('sums failed installs across every package', () => {
      const packages = buildPackageDriftOverview([
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-a') }),
          packages: [
            distributedPackage({
              packageId: 'pkg-a',
              lastDistributionStatus: DistributionStatus.failure,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-b') }),
          target: makeTarget({ id: createTargetId('target-b') }),
          packages: [
            distributedPackage({
              packageId: 'pkg-b',
              lastDistributionStatus: DistributionStatus.failure,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
        makeByTarget({
          gitRepo: makeRepo({ id: createGitRepoId('repo-c') }),
          target: makeTarget({ id: createTargetId('target-c') }),
          packages: [
            distributedPackage({
              packageId: 'pkg-c',
              lastDistributionStatus: DistributionStatus.success,
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
          ],
        }),
      ]);

      expect(totalFailedInstallCount(packages)).toBe(2);
    });
  });
});

describe('sortPackagesByDriftFirst', () => {
  describe('when packages have mixed drift status', () => {
    it('places drifted packages first then alphabetically', () => {
      const packages = buildPackageDriftOverview([
        makeByTarget({
          packages: [
            distributedPackage({
              packageId: 'pkg-a',
              packageOverrides: { name: 'Alpha' },
              standards: [makeStandardInfo({ latest: 1, deployed: 1 })],
            }),
            distributedPackage({
              packageId: 'pkg-b',
              packageOverrides: { name: 'Beta' },
              standards: [makeStandardInfo({ latest: 5, deployed: 1 })],
            }),
          ],
        }),
      ]);

      const sorted = sortPackagesByDriftFirst(packages);
      expect(sorted.map((p) => p.name)).toEqual(['Beta', 'Alpha']);
    });
  });
});
