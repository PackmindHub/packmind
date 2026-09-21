import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createDistributionId,
  createDistributedPackageId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createCommandVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
  RenderMode,
  StandardId,
  CommandId,
  SkillId,
} from '@packmind/types';
import { skillVersionFactory } from '@packmind/skills/test';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DistributionRepository } from './DistributionRepository';
import { OutdatedDeploymentsByTarget } from '../../domain/repositories/IDistributionRepository';

describe('DistributionRepository', () => {
  let repository: DistributionRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<Distribution>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Distribution>>;
  let logger: jest.Mocked<PackmindLogger>;

  const organizationId = createOrganizationId('org-123');
  const targetId = createTargetId('target-456');
  const packageId1 = createPackageId('package-1');
  const packageId2 = createPackageId('package-2');

  const createStandardVersionFor = (
    id: string,
    standardId: string,
    name: string,
  ) => ({
    id: createStandardVersionId(id),
    standardId: createStandardId(standardId),
    name,
    slug: name.toLowerCase().replace(/ /g, '-'),
    description: `Description for ${name}`,
    version: 1,
    gitCommit: undefined,
    userId: createUserId('author-1'),
    scope: null,
  });

  /**
   * Seeds the rows the DISTINCT ON scan returns: one per (target, package)
   * pair that is still active.
   */
  const seedActiveRows = (
    rows: Array<{
      targetId: ReturnType<typeof createTargetId>;
      distributedPackageId: string;
      packageId: ReturnType<typeof createPackageId>;
      distributedAt?: string;
    }>,
  ) => {
    (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(
      rows.map((row) => ({
        distributedAt: '2024-01-01T00:00:00Z',
        ...row,
        operation: 'add',
        renderModes: [],
      })),
    );
  };

  /**
   * Seeds the hydration query: which artifact versions each distributed
   * package carries.
   */
  const seedDistributedVersions = (
    packages: Array<{
      distributedPackageId: string;
      standardVersions?: unknown[];
      recipeVersions?: unknown[];
      skillVersions?: unknown[];
    }>,
  ) => {
    mockQueryBuilder.getMany.mockResolvedValue([
      {
        id: createDistributionId('dist-1'),
        organizationId,
        authorId: createUserId('author-1'),
        status: DistributionStatus.success,
        createdAt: '2024-01-01T00:00:00Z',
        renderModes: [],
        source: 'cli',
        distributedPackages: packages.map((pkg) => ({
          id: createDistributedPackageId(pkg.distributedPackageId),
          distributionId: createDistributionId('dist-1'),
          operation: 'add',
          standardVersions: pkg.standardVersions ?? [],
          recipeVersions: pkg.recipeVersions ?? [],
          skillVersions: pkg.skillVersions ?? [],
        })),
      },
    ] as never);
  };

  const createMockQueryBuilder = (): jest.Mocked<
    SelectQueryBuilder<Distribution>
  > => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Distribution>>;
    return qb;
  };

  beforeEach(() => {
    logger = stubLogger();
    mockQueryBuilder = createMockQueryBuilder();
    mockTypeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Distribution>>;

    repository = new DistributionRepository(mockTypeOrmRepository, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listByOrganizationIdWithStatus', () => {
    describe('when spaceId is provided', () => {
      const spaceId = createSpaceId('space-1');

      beforeEach(async () => {
        mockQueryBuilder.getMany.mockResolvedValue([]);

        await repository.listByOrganizationIdWithStatus(
          organizationId,
          DistributionStatus.success,
          spaceId,
        );
      });

      it('adds spaceId subquery filter via callback', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.any(Function),
        );
      });

      it('sets spaceId parameter', () => {
        expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith(
          'spaceId',
          spaceId,
        );
      });
    });

    describe('when spaceId is not provided', () => {
      beforeEach(async () => {
        mockQueryBuilder.getMany.mockResolvedValue([]);

        await repository.listByOrganizationIdWithStatus(
          organizationId,
          DistributionStatus.success,
        );
      });

      it('does not add spaceId subquery filter', () => {
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          expect.any(Function),
        );
      });

      it('does not set spaceId parameter', () => {
        expect(mockQueryBuilder.setParameter).not.toHaveBeenCalled();
      });
    });
  });

  describe('tracked-branch scoping of distribution history', () => {
    const expectScopedToTrackedBranch = () =>
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tracked_repo."is_tracked" = true'),
        { trackedScopeOrganizationId: organizationId },
      );

    const expectScopedToRemovedTracking = () =>
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(
          'tracked_repo."tracking_removed_at" IS NOT NULL',
        ),
        { trackedScopeOrganizationId: organizationId },
      );

    const expectNotScopedToTrackedBranch = () =>
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('tracked_repo'),
        expect.anything(),
      );

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
    });

    describe('when listing distributions by package', () => {
      const spaceId = createSpaceId('space-1');

      beforeEach(async () => {
        await repository.listByPackageId(packageId1, organizationId, spaceId);
      });

      it('scopes the history to the tracked branch', () => {
        expectScopedToTrackedBranch();
      });

      it('hides a repository whose tracking was removed', () => {
        expectScopedToRemovedTracking();
      });

      it('keeps distributions whose repository row is absent', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('"gitRepo"."id" IS NULL'),
          expect.anything(),
        );
      });

      // TypeORM only rewrites `alias.property` before a space, `=`, `)` or `,`,
      // so the predicate must not rely on it — see TRACKED_BRANCH_SCOPE.
      it('fully qualifies the repository column it filters on', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('"gitRepo"."id" NOT IN'),
          expect.anything(),
        );
      });

      it('joins the distributed package to its owning package', () => {
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'distributedPackage.package',
          'package',
        );
      });

      // Regression test for the vulnerability where a caller who is a member
      // of `spaceId` could pass a `packageId` belonging to a different space
      // in the same organization and still read its distribution history.
      // Fails if the `package.spaceId` scoping is removed from the query.
      it('excludes a package that belongs to a different space in the same organization', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'package.spaceId = :spaceId',
          { spaceId },
        );
      });
    });

    describe('when listing distributions by command', () => {
      beforeEach(async () => {
        await repository.listByCommandId(
          createCommandId('command-1'),
          organizationId,
        );
      });

      it('scopes the history to the tracked branch', () => {
        expectScopedToTrackedBranch();
      });

      it('hides a repository whose tracking was removed', () => {
        expectScopedToRemovedTracking();
      });
    });

    describe('when listing distributions by standard', () => {
      beforeEach(async () => {
        await repository.listByStandardId(
          createStandardId('standard-1'),
          organizationId,
        );
      });

      it('scopes the history to the tracked branch', () => {
        expectScopedToTrackedBranch();
      });

      it('hides a repository whose tracking was removed', () => {
        expectScopedToRemovedTracking();
      });
    });

    describe('when listing distributions by skill', () => {
      beforeEach(async () => {
        await repository.listBySkillId(
          createSkillId('skill-1'),
          organizationId,
        );
      });

      it('scopes the history to the tracked branch', () => {
        expectScopedToTrackedBranch();
      });

      it('hides a repository whose tracking was removed', () => {
        expectScopedToRemovedTracking();
      });
    });

    describe('when listing distributions by organization', () => {
      beforeEach(async () => {
        await repository.listByOrganizationId(organizationId);
      });

      it('leaves every branch visible', () => {
        expectNotScopedToTrackedBranch();
      });
    });

    describe('when listing distributions by target ids', () => {
      beforeEach(async () => {
        await repository.listByTargetIds(organizationId, [targetId]);
      });

      it('leaves every branch visible', () => {
        expectNotScopedToTrackedBranch();
      });
    });
  });

  describe('countActiveArtifactsBySpace', () => {
    const spaceId = createSpaceId('space-1');

    describe('when artifacts are deployed', () => {
      let result: Awaited<
        ReturnType<typeof repository.countActiveArtifactsBySpace>
      >;

      beforeEach(async () => {
        jest
          .spyOn(repository, 'listDeployedArtifactIdsBySpace')
          .mockResolvedValue({
            standardIds: [
              's1' as StandardId,
              's2' as StandardId,
              's3' as StandardId,
            ],
            recipeIds: ['r1' as CommandId, 'r2' as CommandId],
            skillIds: ['sk1' as SkillId],
          });

        result = await repository.countActiveArtifactsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns counts matching deployed artifact IDs', () => {
        expect(result).toEqual({
          standards: 3,
          recipes: 2,
          skills: 1,
        });
      });

      it('delegates to listDeployedArtifactIdsBySpace', () => {
        expect(repository.listDeployedArtifactIdsBySpace).toHaveBeenCalledWith(
          organizationId,
          spaceId,
        );
      });
    });

    describe('when no artifacts are deployed', () => {
      let result: Awaited<
        ReturnType<typeof repository.countActiveArtifactsBySpace>
      >;

      beforeEach(async () => {
        jest
          .spyOn(repository, 'listDeployedArtifactIdsBySpace')
          .mockResolvedValue({
            standardIds: [],
            recipeIds: [],
            skillIds: [],
          });

        result = await repository.countActiveArtifactsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns zeros for all artifact types', () => {
        expect(result).toEqual({
          standards: 0,
          recipes: 0,
          skills: 0,
        });
      });
    });
  });

  describe('findActiveStandardVersionsByTarget', () => {
    const createStandardVersion = (
      id: string,
      standardId: string,
      name: string,
    ) => ({
      id: createStandardVersionId(id),
      standardId: createStandardId(standardId),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      description: `Description for ${name}`,
      version: 1,
      gitCommit: undefined,
      userId: createUserId('author-1'),
      scope: null,
    });

    const createDistribution = (
      id: string,
      createdAt: string,
      distributedPackages: Distribution['distributedPackages'],
    ): Distribution => ({
      id: createDistributionId(id),
      organizationId,
      authorId: createUserId('author-1'),
      status: DistributionStatus.success,
      target: {
        id: targetId,
        name: 'default',
        path: '/',
        gitRepoId: 'git-repo-1' as never,
      },
      distributedPackages,
      createdAt,
      renderModes: [],
      source: 'cli',
    });

    // findActiveDistributedPackages issues a DISTINCT ON query (one row per
    // package, already collapsed to the latest distribution by Postgres) via
    // getRawMany; findActiveVersionsForDistributedPackages then hydrates the
    // surviving packages via getMany. Both run against the same mocked query
    // builder, so both must be stubbed.
    const seedActivePackages = (
      rows: Array<{
        distributedPackageId: string;
        packageId: ReturnType<typeof createPackageId>;
        operation: 'add' | 'remove' | null | undefined;
        distributedAt: string;
      }>,
    ) => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(
        rows.map((row) => ({ ...row, renderModes: [] })),
      );
    };

    describe('with an active package', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        seedActivePackages([
          {
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            operation: 'add',
            distributedAt: '2024-01-01T00:00:00Z',
          },
        ]);

        mockQueryBuilder.getMany.mockResolvedValue([
          createDistribution('dist-1', '2024-01-01T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns one standard version', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the standard version from the active package', () => {
        expect(result[0].id).toBe(sv1.id);
      });
    });

    describe('with a removed package', () => {
      const sv2 = createStandardVersion('sv-2', 'std-2', 'Standard Two');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        seedActivePackages([
          {
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            operation: 'remove',
            distributedAt: '2024-01-02T00:00:00Z',
          },
          {
            distributedPackageId: 'dp-2',
            packageId: packageId2,
            operation: 'add',
            distributedAt: '2024-01-03T00:00:00Z',
          },
        ]);

        mockQueryBuilder.getMany.mockResolvedValue([
          createDistribution('dist-2', '2024-01-03T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [sv2],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('excludes standard versions from the removed package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the standard version from the active package', () => {
        expect(result[0].id).toBe(sv2.id);
      });
    });

    describe('with a null operation', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        seedActivePackages([
          {
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            operation: null,
            distributedAt: '2024-01-01T00:00:00Z',
          },
        ]);

        mockQueryBuilder.getMany.mockResolvedValue([
          createDistribution('dist-1', '2024-01-01T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('treats a null operation as add', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the standard version from the package with a null operation', () => {
        expect(result[0].id).toBe(sv1.id);
      });
    });

    describe('with duplicate standard versions across active packages', () => {
      const svOld = createStandardVersion(
        'sv-1-old',
        'std-1',
        'Standard One Old',
      );
      const svNew = createStandardVersion(
        'sv-1-new',
        'std-1',
        'Standard One New',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        seedActivePackages([
          {
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            operation: 'add',
            distributedAt: '2024-01-01T00:00:00Z',
          },
          {
            distributedPackageId: 'dp-2',
            packageId: packageId2,
            operation: 'add',
            distributedAt: '2024-01-02T00:00:00Z',
          },
        ]);

        mockQueryBuilder.getMany.mockResolvedValue([
          createDistribution('dist-1', '2024-01-01T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [svOld],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
          createDistribution('dist-2', '2024-01-02T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [svNew],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('deduplicates standard versions by standardId', () => {
        expect(result).toHaveLength(1);
      });

      it('keeps the version from the most recently distributed package', () => {
        expect(result[0].id).toBe(svNew.id);
      });
    });

    // The DISTINCT ON collapse itself happens in Postgres and cannot be
    // observed through a mocked query builder. These assertions only lock
    // down that the shared findActiveDistributedPackages query is configured
    // with a deterministic tie-break; every findActive*ByTarget method below
    // relies on this same private helper.
    describe('SQL shape', () => {
      beforeEach(async () => {
        seedActivePackages([]);
        mockQueryBuilder.getMany.mockResolvedValue([]);

        await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('collapses to one row per target and package via DISTINCT ON', () => {
        expect(mockQueryBuilder.distinctOn).toHaveBeenCalledWith([
          'distribution.target_id',
          'distributedPackage.package_id',
        ]);
      });

      it('orders by target id', () => {
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
          'distribution.target_id',
        );
      });

      it('then orders by package id', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distributedPackage.package_id',
        );
      });

      it('breaks ties by distribution createdAt DESC', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distribution.createdAt',
          'DESC',
        );
      });

      it('breaks remaining ties by distribution id DESC', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distribution.id',
          'DESC',
        );
      });
    });
  });

  describe('findActiveVersionsByTarget', () => {
    describe('with active packages', () => {
      const sv1 = {
        id: createStandardVersionId('sv-1'),
        standardId: createStandardId('std-1'),
        name: 'Standard One',
        slug: 'standard-one',
        description: 'Description for Standard One',
        version: 1,
        gitCommit: undefined,
        userId: createUserId('author-1'),
        scope: null,
      };
      const cv1 = {
        id: createCommandVersionId('rv-1'),
        recipeId: createCommandId('command-1'),
        name: 'Command One',
        slug: 'command-one',
        content: 'Content for Command One',
        version: 1,
        userId: null,
      };
      const skv1 = {
        id: createSkillVersionId('skv-1'),
        skillId: createSkillId('skill-1'),
        version: 1,
        userId: createUserId('author-1'),
        name: 'Skill One',
        slug: 'skill-one',
        description: 'Description for Skill One',
        prompt: '',
      };
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTarget>
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          {
            targetId,
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            operation: 'add',
            renderModes: [],
            distributedAt: '2024-01-01T00:00:00Z',
          },
        ]);

        mockQueryBuilder.getMany.mockResolvedValue([
          {
            id: createDistributionId('dist-1'),
            organizationId,
            authorId: createUserId('author-1'),
            status: DistributionStatus.success,
            target: {
              id: targetId,
              name: 'default',
              path: '/',
              gitRepoId: 'git-repo-1' as never,
            },
            distributedPackages: [
              {
                id: createDistributedPackageId('dp-1'),
                distributionId: createDistributionId('dist-1'),
                packageId: packageId1,
                operation: 'add',
                standardVersions: [sv1],
                recipeVersions: [cv1],
                skillVersions: [skv1],
              },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            renderModes: [],
            source: 'cli',
          },
        ]);

        result = await repository.findActiveVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns the active standard versions', () => {
        expect(result.standardVersions).toEqual([sv1]);
      });

      it('returns the active command versions', () => {
        expect(result.commandVersions).toEqual([cv1]);
      });

      it('returns the active skill versions', () => {
        expect(result.skillVersions).toEqual([skv1]);
      });

      it('runs the DISTINCT ON query only once for all three artifact types', () => {
        expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
      });

      it('joins the parent skill to exclude soft-deleted skills', () => {
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'version.skill',
          'skill',
        );
      });
    });

    describe('with a non-empty packageIds array', () => {
      const svOfPackage1 = createStandardVersionFor(
        'sv-1',
        'std-1',
        'From one',
      );
      const svOfPackage2 = createStandardVersionFor(
        'sv-2',
        'std-2',
        'From two',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTarget>
      >;

      beforeEach(async () => {
        seedActiveRows([
          { targetId, distributedPackageId: 'dp-1', packageId: packageId1 },
          { targetId, distributedPackageId: 'dp-2', packageId: packageId2 },
        ]);
        seedDistributedVersions([
          { distributedPackageId: 'dp-1', standardVersions: [svOfPackage1] },
          { distributedPackageId: 'dp-2', standardVersions: [svOfPackage2] },
        ]);

        result = await repository.findActiveVersionsByTarget(
          organizationId,
          targetId,
          [packageId1],
        );
      });

      it('keeps only the artifacts of the requested packages', () => {
        expect(result.standardVersions).toEqual([svOfPackage1]);
      });

      // The scan is deliberately unfiltered so that one read can serve both
      // the restricted and the unrestricted view; the narrowing is in memory.
      it('does not narrow the scan in SQL', () => {
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          'distributedPackage.packageId IN (:...packageIds)',
          expect.anything(),
        );
      });
    });

    describe('with an empty packageIds array', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTarget>
      >;

      beforeEach(async () => {
        result = await repository.findActiveVersionsByTarget(
          organizationId,
          targetId,
          [],
        );
      });

      it('returns empty arrays for all three artifact types', () => {
        expect(result).toEqual({
          standardVersions: [],
          commandVersions: [],
          skillVersions: [],
        });
      });

      it('does not execute a query', () => {
        expect(mockTypeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });
  });

  describe('findActiveVersionsByTargets', () => {
    const targetA = createTargetId('target-a');
    const targetB = createTargetId('target-b');

    describe('when two targets are requested', () => {
      const svOfA = createStandardVersionFor('sv-a', 'std-a', 'Only on A');
      const svOfB = createStandardVersionFor('sv-b', 'std-b', 'Only on B');
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTargets>
      >;

      beforeEach(async () => {
        seedActiveRows([
          {
            targetId: targetA,
            distributedPackageId: 'dp-a',
            packageId: packageId1,
          },
          {
            targetId: targetB,
            distributedPackageId: 'dp-b',
            packageId: packageId2,
          },
        ]);
        seedDistributedVersions([
          { distributedPackageId: 'dp-a', standardVersions: [svOfA] },
          { distributedPackageId: 'dp-b', standardVersions: [svOfB] },
        ]);

        result = await repository.findActiveVersionsByTargets(organizationId, [
          targetA,
          targetB,
        ]);
      });

      it('gives the first target its own versions', () => {
        expect(result.get(targetA)?.all.standardVersions).toEqual([svOfA]);
      });

      it('gives the second target its own versions', () => {
        expect(result.get(targetB)?.all.standardVersions).toEqual([svOfB]);
      });

      it('resolves both targets in one scan', () => {
        expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
      });

      it('scopes the scan to the requested targets', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distribution.target_id IN (:...targetIds)',
          { targetIds: [targetA, targetB] },
        );
      });

      describe('when no package filter is given', () => {
        it('reads fromPackages as everything', () => {
          expect(result.get(targetA)?.fromPackages).toEqual(
            result.get(targetA)?.all,
          );
        });
      });
    });

    describe('when two targets hold different versions of the same standard', () => {
      const olderOnA = createStandardVersionFor('sv-old', 'std-1', 'Shared');
      const newerOnB = createStandardVersionFor('sv-new', 'std-1', 'Shared');
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTargets>
      >;

      beforeEach(async () => {
        seedActiveRows([
          {
            targetId: targetA,
            distributedPackageId: 'dp-a',
            packageId: packageId1,
            distributedAt: '2024-01-01T00:00:00Z',
          },
          {
            targetId: targetB,
            distributedPackageId: 'dp-b',
            packageId: packageId1,
            distributedAt: '2024-06-01T00:00:00Z',
          },
        ]);
        seedDistributedVersions([
          { distributedPackageId: 'dp-a', standardVersions: [olderOnA] },
          { distributedPackageId: 'dp-b', standardVersions: [newerOnB] },
        ]);

        result = await repository.findActiveVersionsByTargets(organizationId, [
          targetA,
          targetB,
        ]);
      });

      // The recency reduce runs per target. Run over every target's rows at
      // once, target B's newer distribution would hide target A's version.
      it('keeps the version the older target actually holds', () => {
        expect(result.get(targetA)?.all.standardVersions).toEqual([olderOnA]);
      });

      it('keeps the version the newer target actually holds', () => {
        expect(result.get(targetB)?.all.standardVersions).toEqual([newerOnB]);
      });
    });

    describe('when packageIds are given', () => {
      const svOfPackage1 = createStandardVersionFor(
        'sv-1',
        'std-1',
        'From one',
      );
      const svOfPackage2 = createStandardVersionFor(
        'sv-2',
        'std-2',
        'From two',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTargets>
      >;

      beforeEach(async () => {
        // Distinct timestamps so the recency order of the unrestricted view
        // is the seeded order rather than an id tie-break.
        seedActiveRows([
          {
            targetId: targetA,
            distributedPackageId: 'dp-1',
            packageId: packageId1,
            distributedAt: '2024-06-01T00:00:00Z',
          },
          {
            targetId: targetA,
            distributedPackageId: 'dp-2',
            packageId: packageId2,
            distributedAt: '2024-01-01T00:00:00Z',
          },
        ]);
        seedDistributedVersions([
          { distributedPackageId: 'dp-1', standardVersions: [svOfPackage1] },
          { distributedPackageId: 'dp-2', standardVersions: [svOfPackage2] },
        ]);

        result = await repository.findActiveVersionsByTargets(
          organizationId,
          [targetA],
          [packageId1],
        );
      });

      it('restricts fromPackages to the requested packages', () => {
        expect(result.get(targetA)?.fromPackages.standardVersions).toEqual([
          svOfPackage1,
        ]);
      });

      it('leaves the unrestricted view whole', () => {
        expect(result.get(targetA)?.all.standardVersions).toEqual([
          svOfPackage1,
          svOfPackage2,
        ]);
      });

      // Both views are reduced from the same scanned rows.
      it('still scans once', () => {
        expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
      });
    });

    describe('when a requested target has no distribution history', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveVersionsByTargets>
      >;

      beforeEach(async () => {
        seedActiveRows([]);
        seedDistributedVersions([]);

        result = await repository.findActiveVersionsByTargets(organizationId, [
          targetA,
        ]);
      });

      it('still gives it an entry, with empty arrays', () => {
        expect(result.get(targetA)?.all).toEqual({
          standardVersions: [],
          commandVersions: [],
          skillVersions: [],
        });
      });
    });

    describe('when no target is requested', () => {
      it('returns an empty map without querying', async () => {
        const result = await repository.findActiveVersionsByTargets(
          organizationId,
          [],
        );

        expect(result.size).toBe(0);
      });
    });
  });

  describe('findActiveRenderModesByTarget', () => {
    const activeRow = (
      distributedPackageId: string,
      packageId: ReturnType<typeof createPackageId>,
      renderModes: unknown,
    ) => ({
      distributedPackageId,
      packageId,
      operation: 'add' as const,
      renderModes,
      distributedAt: '2024-01-01T00:00:00Z',
    });

    describe('when active packages have render modes', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveRenderModesByTarget>
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          activeRow('dp-1', packageId1, [RenderMode.CLAUDE, RenderMode.CURSOR]),
          activeRow('dp-2', packageId2, [RenderMode.CURSOR]),
        ]);

        result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns the union of render modes across active packages', () => {
        expect([...result].sort()).toEqual(
          [RenderMode.CLAUDE, RenderMode.CURSOR].sort(),
        );
      });
    });

    describe('when there are no active packages', () => {
      it('returns an empty array', async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

        const result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );

        expect(result).toEqual([]);
      });
    });

    describe('when a package render_modes value is malformed JSON', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveRenderModesByTarget>
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          activeRow('dp-1', packageId1, [RenderMode.CLAUDE]),
          activeRow('dp-2', packageId2, '{not valid json'),
        ]);

        result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );
      });

      it('still returns render modes from well-formed rows', () => {
        expect(result).toEqual([RenderMode.CLAUDE]);
      });
    });

    describe('when a package render_modes value parses to a non-array', () => {
      it('contributes no render modes', async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          activeRow('dp-1', packageId1, '{"foo":"bar"}'),
        ]);

        const result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe('listDeployedArtifactIdsBySpace', () => {
    const spaceId = createSpaceId('space-1');

    const createDistribution = (
      id: string,
      createdAt: string,
      distributedPackages: Distribution['distributedPackages'],
    ): Distribution => ({
      id: createDistributionId(id),
      organizationId,
      authorId: createUserId('author-1'),
      status: DistributionStatus.success,
      target: {
        id: targetId,
        name: 'default',
        path: '/',
        gitRepoId: 'git-repo-1' as never,
      },
      distributedPackages,
      createdAt,
      renderModes: [],
      source: 'cli',
    });

    describe('with deployed artifacts across packages', () => {
      const standardId1 = createStandardId('std-1');
      const standardId2 = createStandardId('std-2');
      const commandId1 = createCommandId('command-1');
      const skillId1 = createSkillId('skill-1');

      let result: Awaited<
        ReturnType<typeof repository.listDeployedArtifactIdsBySpace>
      >;

      beforeEach(async () => {
        const distribution = createDistribution(
          'dist-1',
          '2024-01-02T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [
                {
                  id: createStandardVersionId('sv-1'),
                  standardId: standardId1,
                  name: 'Standard One',
                  slug: 'standard-one',
                  description: 'desc',
                  version: 1,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
                {
                  id: createStandardVersionId('sv-2'),
                  standardId: standardId2,
                  name: 'Standard Two',
                  slug: 'standard-two',
                  description: 'desc',
                  version: 1,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [
                {
                  id: createCommandVersionId('rv-1'),
                  recipeId: commandId1,
                  name: 'Command One',
                  slug: 'command-one',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              skillVersions: [
                skillVersionFactory({
                  id: createSkillVersionId('skv-1'),
                  skillId: skillId1,
                  name: 'Skill One',
                  slug: 'skill-one',
                  prompt: 'content',
                  version: 1,
                }),
              ],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([distribution]);

        result = await repository.listDeployedArtifactIdsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns standard IDs', () => {
        expect(result.standardIds).toEqual([standardId1, standardId2]);
      });

      it('returns command IDs', () => {
        expect(result.recipeIds).toEqual([commandId1]);
      });

      it('returns skill IDs', () => {
        expect(result.skillIds).toEqual([skillId1]);
      });
    });

    describe('with removed packages', () => {
      const standardId1 = createStandardId('std-1');
      const standardId2 = createStandardId('std-2');

      let result: Awaited<
        ReturnType<typeof repository.listDeployedArtifactIdsBySpace>
      >;

      beforeEach(async () => {
        const addDistribution = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [
                {
                  id: createStandardVersionId('sv-1'),
                  standardId: standardId1,
                  name: 'Standard One',
                  slug: 'standard-one',
                  description: 'desc',
                  version: 1,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const removeDistribution = createDistribution(
          'dist-2',
          '2024-01-02T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId1,
              operation: 'remove',
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const addDistribution2 = createDistribution(
          'dist-3',
          '2024-01-03T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-3'),
              distributionId: createDistributionId('dist-3'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [
                {
                  id: createStandardVersionId('sv-2'),
                  standardId: standardId2,
                  name: 'Standard Two',
                  slug: 'standard-two',
                  description: 'desc',
                  version: 1,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          addDistribution2,
          removeDistribution,
          addDistribution,
        ]);

        result = await repository.listDeployedArtifactIdsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('excludes IDs from removed packages', () => {
        expect(result.standardIds).toEqual([standardId2]);
      });

      it('returns empty arrays for artifact types with no active deployments', () => {
        expect(result.recipeIds).toEqual([]);
      });
    });

    describe('with no distributions', () => {
      let result: Awaited<
        ReturnType<typeof repository.listDeployedArtifactIdsBySpace>
      >;

      beforeEach(async () => {
        mockQueryBuilder.getMany.mockResolvedValue([]);

        result = await repository.listDeployedArtifactIdsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns empty standard IDs', () => {
        expect(result.standardIds).toEqual([]);
      });

      it('returns empty command IDs', () => {
        expect(result.recipeIds).toEqual([]);
      });

      it('returns empty skill IDs', () => {
        expect(result.skillIds).toEqual([]);
      });
    });

    describe('with duplicate artifact IDs across targets', () => {
      const standardId1 = createStandardId('std-1');
      const targetId2 = createTargetId('target-789');

      let result: Awaited<
        ReturnType<typeof repository.listDeployedArtifactIdsBySpace>
      >;

      beforeEach(async () => {
        const distribution1 = createDistribution(
          'dist-1',
          '2024-01-02T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [
                {
                  id: createStandardVersionId('sv-1'),
                  standardId: standardId1,
                  name: 'Standard One',
                  slug: 'standard-one',
                  description: 'desc',
                  version: 1,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const distribution2: Distribution = {
          ...createDistribution('dist-2', '2024-01-03T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [
                {
                  id: createStandardVersionId('sv-1b'),
                  standardId: standardId1,
                  name: 'Standard One',
                  slug: 'standard-one',
                  description: 'desc',
                  version: 2,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [],
              skillVersions: [],
            },
          ]),
          target: {
            id: targetId2,
            name: 'other-target',
            path: '/',
            gitRepoId: 'git-repo-2' as never,
          },
        };

        mockQueryBuilder.getMany.mockResolvedValue([
          distribution2,
          distribution1,
        ]);

        result = await repository.listDeployedArtifactIdsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('deduplicates standard IDs across targets', () => {
        expect(result.standardIds).toEqual([standardId1]);
      });
    });
  });

  describe('findOutdatedDeploymentsBySpace', () => {
    const spaceId = createSpaceId('space-1');
    const targetId1 = createTargetId('target-1');
    const targetId2 = createTargetId('target-2');
    const gitRepoId1 = createGitRepoId('git-repo-1');
    const gitRepoId2 = createGitRepoId('git-repo-2');

    type LatestRowRaw = {
      distributedPackageId: string;
      targetId: ReturnType<typeof createTargetId>;
      targetName: string;
      gitRepoId: string;
      deploymentDate: string;
    };
    type StandardVersionRowRaw = {
      distributedPackageId: string;
      standardId: StandardId;
      name: string;
      slug: string;
      version: number;
    };
    type CommandVersionRowRaw = {
      distributedPackageId: string;
      commandId: CommandId;
      name: string;
      slug: string;
      version: number;
    };
    type SkillVersionRowRaw = {
      distributedPackageId: string;
      skillId: SkillId;
      name: string;
      slug: string;
      version: number;
    };

    const seedRawMany = (
      latestRows: LatestRowRaw[],
      standardRows: StandardVersionRowRaw[] = [],
      commandRows: CommandVersionRowRaw[] = [],
      skillRows: SkillVersionRowRaw[] = [],
    ) => {
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce(latestRows)
        .mockResolvedValueOnce(standardRows)
        .mockResolvedValueOnce(commandRows)
        .mockResolvedValueOnce(skillRows);
    };

    describe('with standards and commands across multiple targets', () => {
      const standardId1 = createStandardId('std-1');
      const standardId2 = createStandardId('std-2');
      const commandId1 = createCommandId('command-1');

      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        seedRawMany(
          [
            {
              distributedPackageId: 'dp-1',
              targetId: targetId1,
              targetName: 'Target One',
              gitRepoId: gitRepoId1,
              deploymentDate: '2024-01-02T00:00:00Z',
            },
            {
              distributedPackageId: 'dp-2',
              targetId: targetId2,
              targetName: 'Target Two',
              gitRepoId: gitRepoId2,
              deploymentDate: '2024-01-03T00:00:00Z',
            },
          ],
          [
            {
              distributedPackageId: 'dp-1',
              standardId: standardId1,
              name: 'Standard One',
              slug: 'standard-one',
              version: 2,
            },
            {
              distributedPackageId: 'dp-2',
              standardId: standardId2,
              name: 'Standard Two',
              slug: 'standard-two',
              version: 1,
            },
          ],
          [
            {
              distributedPackageId: 'dp-1',
              commandId: commandId1,
              name: 'Command One',
              slug: 'command-one',
              version: 3,
            },
          ],
        );

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns entries for both targets', () => {
        expect(result).toHaveLength(2);
      });

      it('sets correct target name for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.targetName).toBe('Target One');
      });

      it('sets correct gitRepoId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.gitRepoId).toBe(gitRepoId1);
      });

      it('sets correct standard artifactId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards[0].artifactId).toBe(standardId1);
      });

      it('sets correct standard deployedVersion for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards[0].deployedVersion).toBe(2);
      });

      it('sets correct command artifactId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].artifactId).toBe(commandId1);
      });

      it('sets correct command deployedVersion for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].deployedVersion).toBe(3);
      });

      it('sets correct standard artifactId for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.standards[0].artifactId).toBe(standardId2);
      });

      it('includes no commands for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.recipes).toHaveLength(0);
      });
    });

    describe('SQL shape', () => {
      it("filters latest distributions to operation='add'", async () => {
        seedRawMany([]);

        await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distributedPackage.operation = :operation',
          { operation: 'add' },
        );
      });

      it('uses DISTINCT ON (target_id, package_id) to keep one row per pair', async () => {
        seedRawMany([]);

        await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );

        expect(mockQueryBuilder.distinctOn).toHaveBeenCalledWith([
          'distribution.target_id',
          'distributedPackage.package_id',
        ]);
      });

      it('breaks distinctOn ties deterministically by distribution id DESC', async () => {
        seedRawMany([]);

        await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );

        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distribution.id',
          'DESC',
        );
      });
    });

    describe('with no distributions', () => {
      it('returns an empty array', async () => {
        seedRawMany([]);

        const result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );

        expect(result).toEqual([]);
      });
    });

    describe('with duplicate standard versions across distributedPackages', () => {
      const standardId1 = createStandardId('std-1');

      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        seedRawMany(
          [
            {
              distributedPackageId: 'dp-1',
              targetId: targetId1,
              targetName: 'Target One',
              gitRepoId: gitRepoId1,
              deploymentDate: '2024-01-01T00:00:00Z',
            },
            {
              distributedPackageId: 'dp-2',
              targetId: targetId1,
              targetName: 'Target One',
              gitRepoId: gitRepoId1,
              deploymentDate: '2024-01-02T00:00:00Z',
            },
          ],
          [
            {
              distributedPackageId: 'dp-2',
              standardId: standardId1,
              name: 'Standard One v2',
              slug: 'standard-one-v2',
              version: 2,
            },
            {
              distributedPackageId: 'dp-1',
              standardId: standardId1,
              name: 'Standard One v1',
              slug: 'standard-one-v1',
              version: 1,
            },
          ],
        );

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('keeps only one standard after deduplication', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards).toHaveLength(1);
      });

      it('keeps the first-seen version after deduplication', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards[0].deployedVersion).toBe(2);
      });
    });
  });

  describe('findActivePackageOperationsBySpace', () => {
    const spaceId = createSpaceId('space-findby-1');
    const lastDistributedAt = '2026-04-30T10:00:00.000Z';

    const rawRow = (
      packageId: ReturnType<typeof createPackageId>,
      operation: 'add' | 'remove',
      status: DistributionStatus,
    ) => ({
      targetId,
      packageId,
      operation,
      status,
      lastDistributedAt,
    });

    it('projects successful adds onto the active-row shape', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'add', DistributionStatus.success),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([
        {
          targetId,
          packageId: packageId1,
          lastDistributionStatus: DistributionStatus.success,
          lastDistributedAt,
        },
      ]);
    });

    it('keeps failed removes (the package is still effectively distributed)', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'remove', DistributionStatus.failure),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([
        {
          targetId,
          packageId: packageId1,
          lastDistributionStatus: DistributionStatus.failure,
          lastDistributedAt,
        },
      ]);
    });

    it('drops successful removes (the package is no longer on the target)', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'remove', DistributionStatus.success),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([]);
    });

    it('keeps failed adds so the UI can surface the failed distribution status', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'add', DistributionStatus.failure),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([
        {
          targetId,
          packageId: packageId1,
          lastDistributionStatus: DistributionStatus.failure,
          lastDistributedAt,
        },
      ]);
    });

    it('keeps in-progress adds so the UI can surface the in-progress status', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'add', DistributionStatus.in_progress),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([
        {
          targetId,
          packageId: packageId1,
          lastDistributionStatus: DistributionStatus.in_progress,
          lastDistributedAt,
        },
      ]);
    });

    it('filters by spaceId via parameterized query', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      await repository.findActivePackageOperationsBySpace(spaceId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'package.spaceId = :spaceId',
        { spaceId },
      );
    });

    it('uses DISTINCT ON (target_id, package_id) to keep one row per pair', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      await repository.findActivePackageOperationsBySpace(spaceId);

      expect(mockQueryBuilder.distinctOn).toHaveBeenCalledWith([
        'distribution.target_id',
        'distributedPackage.package_id',
      ]);
    });

    describe('orders by (target_id, package_id, createdAt DESC) so DISTINCT ON keeps the latest', () => {
      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);
        await repository.findActivePackageOperationsBySpace(spaceId);
      });

      it('orders by target_id first', () => {
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
          'distribution.target_id',
        );
      });

      it('adds order by package_id', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distributedPackage.package_id',
        );
      });

      it('adds order by createdAt DESC', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distribution.createdAt',
          'DESC',
        );
      });

      it('breaks remaining ties by distribution id DESC', () => {
        expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
          'distribution.id',
          'DESC',
        );
      });
    });

    describe('joins distributedPackages and package without selecting them', () => {
      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);
        await repository.findActivePackageOperationsBySpace(spaceId);
      });

      it('joins distributedPackages', () => {
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'distribution.distributedPackages',
          'distributedPackage',
        );
      });

      it('joins package', () => {
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'distributedPackage.package',
          'package',
        );
      });
    });

    describe('when no rows match the space', () => {
      it('returns an empty array', async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

        const result =
          await repository.findActivePackageOperationsBySpace(spaceId);

        expect(result).toEqual([]);
      });
    });
  });

  describe('findLastSuccessfulDistributionDateByProviderIds', () => {
    const providerA = 'provider-a' as never;
    const providerB = 'provider-b' as never;

    describe('when no provider IDs are supplied', () => {
      let result: Map<unknown, string>;

      beforeEach(async () => {
        result =
          await repository.findLastSuccessfulDistributionDateByProviderIds(
            organizationId,
            [],
          );
      });

      it('returns an empty map', () => {
        expect(result.size).toBe(0);
      });

      it('does not issue a query', () => {
        expect(mockTypeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('when rows are returned', () => {
      let result: Map<unknown, string>;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          {
            providerId: providerA,
            lastDeployedAt: new Date('2026-05-01T10:00:00.000Z'),
          },
          {
            providerId: providerB,
            lastDeployedAt: '2026-04-15T08:30:00.000Z',
          },
        ]);

        result =
          await repository.findLastSuccessfulDistributionDateByProviderIds(
            organizationId,
            [providerA, providerB],
          );
      });

      it('maps Date values to ISO strings', () => {
        expect(result.get(providerA)).toBe('2026-05-01T10:00:00.000Z');
      });

      it('passes through pre-formatted string timestamps unchanged', () => {
        expect(result.get(providerB)).toBe('2026-04-15T08:30:00.000Z');
      });

      it('filters by successful status', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distribution.status = :status',
          { status: DistributionStatus.success },
        );
      });

      it('groups by git provider', () => {
        expect(
          (mockQueryBuilder as unknown as { groupBy: jest.Mock }).groupBy,
        ).toHaveBeenCalledWith('gitRepo.providerId');
      });
    });

    describe('when a provider has no matching distribution', () => {
      it('omits the provider from the map', async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

        const result =
          await repository.findLastSuccessfulDistributionDateByProviderIds(
            organizationId,
            [providerA],
          );

        expect(result.has(providerA)).toBe(false);
      });
    });
  });
});
