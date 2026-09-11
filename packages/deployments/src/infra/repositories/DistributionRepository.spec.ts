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
      beforeEach(async () => {
        await repository.listByPackageId(packageId1, organizationId);
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

      it('collapses to one row per package via DISTINCT ON', () => {
        expect(mockQueryBuilder.distinctOn).toHaveBeenCalledWith([
          'distributedPackage.package_id',
        ]);
      });

      it('orders by package id', () => {
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
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

  describe('findActiveCommandVersionsByTarget', () => {
    const createCommandVersion = (
      id: string,
      recipeId: string,
      name: string,
    ) => ({
      id: createCommandVersionId(id),
      recipeId: createCommandId(recipeId),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      content: `Content for ${name}`,
      version: 1,
      userId: null,
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
      const rv1 = createCommandVersion('rv-1', 'recipe-1', 'Recipe One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveCommandVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveCommandVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns one command version', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the command version from the active package', () => {
        expect(result[0].id).toBe(rv1.id);
      });
    });

    describe('with a removed package', () => {
      const rv2 = createCommandVersion('rv-2', 'recipe-2', 'Recipe Two');
      let result: Awaited<
        ReturnType<typeof repository.findActiveCommandVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rv2],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveCommandVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('excludes command versions from the removed package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the command version from the active package', () => {
        expect(result[0].id).toBe(rv2.id);
      });
    });

    describe('with a null operation', () => {
      const rv1 = createCommandVersion('rv-1', 'recipe-1', 'Recipe One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveCommandVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveCommandVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('treats a null operation as add', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the command version from the package with a null operation', () => {
        expect(result[0].id).toBe(rv1.id);
      });
    });

    describe('with duplicate command versions across active packages', () => {
      const rvOld = createCommandVersion(
        'rv-1-old',
        'recipe-1',
        'Recipe One Old',
      );
      const rvNew = createCommandVersion(
        'rv-1-new',
        'recipe-1',
        'Recipe One New',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveCommandVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rvOld],
              skillVersions: [],
            },
          ]),
          createDistribution('dist-2', '2024-01-02T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [rvNew],
              skillVersions: [],
            },
          ]),
        ]);

        result = await repository.findActiveCommandVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('deduplicates command versions by recipeId', () => {
        expect(result).toHaveLength(1);
      });

      it('keeps the version from the most recently distributed package', () => {
        expect(result[0].id).toBe(rvNew.id);
      });
    });
  });

  describe('findActiveSkillVersionsByTarget', () => {
    const createSkillVersion = (id: string, skillId: string, name: string) => ({
      id: createSkillVersionId(id),
      skillId: createSkillId(skillId),
      version: 1,
      userId: createUserId('author-1'),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      description: `Description for ${name}`,
      prompt: '',
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
      const skv1 = createSkillVersion('skv-1', 'skill-1', 'Skill One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveSkillVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skv1],
            },
          ]),
        ]);

        result = await repository.findActiveSkillVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns one skill version', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the skill version from the active package', () => {
        expect(result[0].id).toBe(skv1.id);
      });
    });

    describe('with a removed package', () => {
      const skv2 = createSkillVersion('skv-2', 'skill-2', 'Skill Two');
      let result: Awaited<
        ReturnType<typeof repository.findActiveSkillVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skv2],
            },
          ]),
        ]);

        result = await repository.findActiveSkillVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('excludes skill versions from the removed package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the skill version from the active package', () => {
        expect(result[0].id).toBe(skv2.id);
      });
    });

    describe('with a null operation', () => {
      const skv1 = createSkillVersion('skv-1', 'skill-1', 'Skill One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveSkillVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skv1],
            },
          ]),
        ]);

        result = await repository.findActiveSkillVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('treats a null operation as add', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the skill version from the package with a null operation', () => {
        expect(result[0].id).toBe(skv1.id);
      });
    });

    describe('with duplicate skill versions across active packages', () => {
      const skvOld = createSkillVersion(
        'skv-1-old',
        'skill-1',
        'Skill One Old',
      );
      const skvNew = createSkillVersion(
        'skv-1-new',
        'skill-1',
        'Skill One New',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveSkillVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skvOld],
            },
          ]),
          createDistribution('dist-2', '2024-01-02T00:00:00Z', [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skvNew],
            },
          ]),
        ]);

        result = await repository.findActiveSkillVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('deduplicates skill versions by skillId', () => {
        expect(result).toHaveLength(1);
      });

      it('keeps the version from the most recently distributed package', () => {
        expect(result[0].id).toBe(skvNew.id);
      });
    });

    // A soft-deleted parent Skill can no longer be simulated at this layer:
    // exclusion now happens through the DB-level join below (TypeORM omits
    // rows whose joined soft-deletable relation is deleted) rather than an
    // in-memory filter. The most a mocked query builder can prove is that the
    // join guarding that exclusion is actually requested.
    describe('SQL shape', () => {
      const skv1 = createSkillVersion('skv-1', 'skill-1', 'Skill One');

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
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [skv1],
            },
          ]),
        ]);

        await repository.findActiveSkillVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('joins the parent skill to exclude soft-deleted skills', () => {
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'version.skill',
          'skill',
        );
      });
    });
  });

  describe('findActiveStandardVersionsByTargetAndPackages', () => {
    describe('with a non-empty packageIds array', () => {
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
      let result: Awaited<
        ReturnType<
          typeof repository.findActiveStandardVersionsByTargetAndPackages
        >
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          {
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
                recipeVersions: [],
                skillVersions: [],
              },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            renderModes: [],
            source: 'cli',
          },
        ]);

        result = await repository.findActiveStandardVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [packageId1],
        );
      });

      it('returns the standard version for the requested package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct standard version id', () => {
        expect(result[0].id).toBe(sv1.id);
      });

      it('filters distributed packages by the requested package ids', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distributedPackage.packageId IN (:...packageIds)',
          { packageIds: [packageId1] },
        );
      });
    });

    describe('with an empty packageIds array', () => {
      let result: Awaited<
        ReturnType<
          typeof repository.findActiveStandardVersionsByTargetAndPackages
        >
      >;

      beforeEach(async () => {
        result = await repository.findActiveStandardVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [],
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      // An empty `IN (...)` list is a SQL syntax error; the guard must
      // short-circuit before any query is built.
      it('does not execute a query', () => {
        expect(mockTypeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });
  });

  describe('findActiveCommandVersionsByTargetAndPackages', () => {
    describe('with a non-empty packageIds array', () => {
      const rv1 = {
        id: createCommandVersionId('rv-1'),
        recipeId: createCommandId('recipe-1'),
        name: 'Recipe One',
        slug: 'recipe-one',
        content: 'Content for Recipe One',
        version: 1,
        userId: null,
      };
      let result: Awaited<
        ReturnType<
          typeof repository.findActiveCommandVersionsByTargetAndPackages
        >
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          {
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
                standardVersions: [],
                recipeVersions: [rv1],
                skillVersions: [],
              },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            renderModes: [],
            source: 'cli',
          },
        ]);

        result = await repository.findActiveCommandVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [packageId1],
        );
      });

      it('returns the command version for the requested package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct command version id', () => {
        expect(result[0].id).toBe(rv1.id);
      });

      it('filters distributed packages by the requested package ids', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distributedPackage.packageId IN (:...packageIds)',
          { packageIds: [packageId1] },
        );
      });
    });

    describe('with an empty packageIds array', () => {
      let result: Awaited<
        ReturnType<
          typeof repository.findActiveCommandVersionsByTargetAndPackages
        >
      >;

      beforeEach(async () => {
        result = await repository.findActiveCommandVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [],
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not execute a query', () => {
        expect(mockTypeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });
  });

  describe('findActiveSkillVersionsByTargetAndPackages', () => {
    describe('with a non-empty packageIds array', () => {
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
        ReturnType<typeof repository.findActiveSkillVersionsByTargetAndPackages>
      >;

      beforeEach(async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          {
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
                standardVersions: [],
                recipeVersions: [],
                skillVersions: [skv1],
              },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            renderModes: [],
            source: 'cli',
          },
        ]);

        result = await repository.findActiveSkillVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [packageId1],
        );
      });

      it('returns the skill version for the requested package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct skill version id', () => {
        expect(result[0].id).toBe(skv1.id);
      });

      it('filters distributed packages by the requested package ids', () => {
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'distributedPackage.packageId IN (:...packageIds)',
          { packageIds: [packageId1] },
        );
      });
    });

    describe('with an empty packageIds array', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveSkillVersionsByTargetAndPackages>
      >;

      beforeEach(async () => {
        result = await repository.findActiveSkillVersionsByTargetAndPackages(
          organizationId,
          targetId,
          [],
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });

      it('does not execute a query', () => {
        expect(mockTypeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
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
      const rv1 = {
        id: createCommandVersionId('rv-1'),
        recipeId: createCommandId('recipe-1'),
        name: 'Recipe One',
        slug: 'recipe-one',
        content: 'Content for Recipe One',
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
                recipeVersions: [rv1],
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
        expect(result.commandVersions).toEqual([rv1]);
      });

      it('returns the active skill versions', () => {
        expect(result.skillVersions).toEqual([skv1]);
      });

      // The whole point of the batched method is to avoid re-running the
      // DISTINCT ON query once per artifact type.
      it('runs the DISTINCT ON query only once for all three artifact types', () => {
        expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
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

      it('logs a warning instead of silently dropping the row', () => {
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    describe('when a package render_modes value parses to a non-array', () => {
      it('logs a warning for the malformed shape', async () => {
        (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
          activeRow('dp-1', packageId1, '{"foo":"bar"}'),
        ]);

        await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );

        expect(logger.warn).toHaveBeenCalled();
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
      const commandId1 = createCommandId('recipe-1');
      const skillId1 = 'skill-1' as never;

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
                  summary: null,
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
                  summary: null,
                  gitCommit: undefined,
                  userId: createUserId('author-1'),
                  scope: null,
                },
              ],
              recipeVersions: [
                {
                  id: createCommandVersionId('rv-1'),
                  recipeId: commandId1,
                  name: 'Recipe One',
                  slug: 'recipe-one',
                  content: 'content',
                  version: 1,
                  summary: null,
                  userId: null,
                },
              ],
              skillVersions: [
                {
                  id: 'skv-1' as never,
                  skillId: skillId1,
                  name: 'Skill One',
                  slug: 'skill-one',
                  content: 'content',
                  version: 1,
                  summary: null,
                  userId: null,
                },
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

      it('returns recipe IDs', () => {
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
                  summary: null,
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
                  summary: null,
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

      it('returns empty recipe IDs', () => {
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
                  summary: null,
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
                  summary: null,
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
      recipeId: CommandId;
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

    describe('with standards and recipes across multiple targets', () => {
      const standardId1 = createStandardId('std-1');
      const standardId2 = createStandardId('std-2');
      const commandId1 = createCommandId('recipe-1');

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
              recipeId: commandId1,
              name: 'Recipe One',
              slug: 'recipe-one',
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

      it('sets correct recipe artifactId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].artifactId).toBe(commandId1);
      });

      it('sets correct recipe deployedVersion for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].deployedVersion).toBe(3);
      });

      it('sets correct standard artifactId for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.standards[0].artifactId).toBe(standardId2);
      });

      it('includes no recipes for second target', () => {
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
