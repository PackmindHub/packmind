import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createDistributionId,
  createDistributedPackageId,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
  RenderMode,
  StandardId,
  RecipeId,
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
      summary: null,
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

    describe('with active packages', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
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
              standardVersions: [sv1],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([distribution]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns one standard version', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct standard version id', () => {
        expect(result[0].id).toBe(sv1.id);
      });
    });

    describe('with removed packages', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      const sv2 = createStandardVersion('sv-2', 'std-2', 'Standard Two');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
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
              standardVersions: [sv1],
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
              standardVersions: [sv2],
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

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('excludes standard versions from removed packages', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the standard version from active package', () => {
        expect(result[0].id).toBe(sv2.id);
      });
    });

    describe('when package is re-added after removal', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        const addDistribution1 = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
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
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          addDistribution2,
          removeDistribution,
          addDistribution1,
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('includes standard versions from re-added package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct standard version id', () => {
        expect(result[0].id).toBe(sv1.id);
      });
    });

    describe('with null/undefined operation', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        const distribution = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: undefined as never,
              standardVersions: [sv1],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([distribution]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('treats null/undefined operation as add', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the standard version from package with undefined operation', () => {
        expect(result[0].id).toBe(sv1.id);
      });
    });

    describe('with duplicate standard versions', () => {
      const sv1v1 = createStandardVersion(
        'sv-1-v1',
        'std-1',
        'Standard One v1',
      );
      const sv1v2 = createStandardVersion(
        'sv-1-v2',
        'std-1',
        'Standard One v2',
      );
      let result: Awaited<
        ReturnType<typeof repository.findActiveStandardVersionsByTarget>
      >;

      beforeEach(async () => {
        const distribution1 = createDistribution(
          'dist-2',
          '2024-01-02T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1v2],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const distribution2 = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [sv1v1],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          distribution1,
          distribution2,
        ]);

        result = await repository.findActiveStandardVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('deduplicates standard versions by standardId', () => {
        expect(result).toHaveLength(1);
      });

      it('keeps the most recent version', () => {
        expect(result[0].id).toBe(sv1v2.id);
      });
    });
  });

  describe('findActiveRecipeVersionsByTarget', () => {
    const createRecipeVersion = (
      id: string,
      recipeId: string,
      name: string,
    ) => ({
      id: createRecipeVersionId(id),
      recipeId: createRecipeId(recipeId),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      content: `Content for ${name}`,
      version: 1,
      summary: null,
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

    describe('with active packages', () => {
      const rv1 = createRecipeVersion('rv-1', 'recipe-1', 'Recipe One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveRecipeVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([distribution]);

        result = await repository.findActiveRecipeVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns one recipe version', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct recipe version id', () => {
        expect(result[0].id).toBe(rv1.id);
      });
    });

    describe('with removed packages', () => {
      const rv1 = createRecipeVersion('rv-1', 'recipe-1', 'Recipe One');
      const rv2 = createRecipeVersion('rv-2', 'recipe-2', 'Recipe Two');
      let result: Awaited<
        ReturnType<typeof repository.findActiveRecipeVersionsByTarget>
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
              standardVersions: [],
              recipeVersions: [rv1],
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
              standardVersions: [],
              recipeVersions: [rv2],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          addDistribution2,
          removeDistribution,
          addDistribution,
        ]);

        result = await repository.findActiveRecipeVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('excludes recipe versions from removed packages', () => {
        expect(result).toHaveLength(1);
      });

      it('returns only the recipe version from active package', () => {
        expect(result[0].id).toBe(rv2.id);
      });
    });

    describe('when package is re-added after removal', () => {
      const rv1 = createRecipeVersion('rv-1', 'recipe-1', 'Recipe One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveRecipeVersionsByTarget>
      >;

      beforeEach(async () => {
        const addDistribution1 = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
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
              packageId: packageId1,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          addDistribution2,
          removeDistribution,
          addDistribution1,
        ]);

        result = await repository.findActiveRecipeVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('includes recipe versions from re-added package', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct recipe version id', () => {
        expect(result[0].id).toBe(rv1.id);
      });
    });

    describe('with null/undefined operation', () => {
      const rv1 = createRecipeVersion('rv-1', 'recipe-1', 'Recipe One');
      let result: Awaited<
        ReturnType<typeof repository.findActiveRecipeVersionsByTarget>
      >;

      beforeEach(async () => {
        const distribution = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: undefined as never,
              standardVersions: [],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([distribution]);

        result = await repository.findActiveRecipeVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('treats null/undefined operation as add', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the recipe version from package with undefined operation', () => {
        expect(result[0].id).toBe(rv1.id);
      });
    });

    describe('with duplicate recipe versions', () => {
      const rv1v1 = createRecipeVersion('rv-1-v1', 'recipe-1', 'Recipe One v1');
      const rv1v2 = createRecipeVersion('rv-1-v2', 'recipe-1', 'Recipe One v2');
      let result: Awaited<
        ReturnType<typeof repository.findActiveRecipeVersionsByTarget>
      >;

      beforeEach(async () => {
        const distribution1 = createDistribution(
          'dist-2',
          '2024-01-02T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [rv1v2],
              skillVersions: [],
            },
          ],
        );

        const distribution2 = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [rv1v1],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          distribution1,
          distribution2,
        ]);

        result = await repository.findActiveRecipeVersionsByTarget(
          organizationId,
          targetId,
        );
      });

      it('deduplicates recipe versions by recipeId', () => {
        expect(result).toHaveLength(1);
      });

      it('keeps the most recent version', () => {
        expect(result[0].id).toBe(rv1v2.id);
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
            recipeIds: ['r1' as RecipeId, 'r2' as RecipeId],
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
      const recipeId1 = createRecipeId('recipe-1');
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
                  id: createRecipeVersionId('rv-1'),
                  recipeId: recipeId1,
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
        expect(result.recipeIds).toEqual([recipeId1]);
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

  describe('findActiveRenderModesByTarget', () => {
    const createDistribution = (
      id: string,
      createdAt: string,
      renderModes: RenderMode[],
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
      renderModes,
      source: 'cli',
    });

    describe('when active packages have distributions', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveRenderModesByTarget>
      >;

      beforeEach(async () => {
        jest
          .spyOn(repository, 'findActivePackageIdsByTarget')
          .mockResolvedValue([packageId1, packageId2]);

        const distribution1 = createDistribution(
          'dist-3',
          '2024-01-03T00:00:00Z',
          [RenderMode.CLAUDE],
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-3'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const distribution2 = createDistribution(
          'dist-2',
          '2024-01-02T00:00:00Z',
          [RenderMode.CURSOR],
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const distribution3 = createDistribution(
          'dist-1',
          '2024-01-01T00:00:00Z',
          [RenderMode.PACKMIND],
          [
            {
              id: createDistributedPackageId('dp-3'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([
          distribution1,
          distribution2,
          distribution3,
        ]);

        result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns the union of latest render modes per active package', () => {
        const sorted = [...result].sort();
        expect(sorted).toEqual([RenderMode.CLAUDE, RenderMode.CURSOR].sort());
      });
    });

    describe('when no active packages exist', () => {
      let result: Awaited<
        ReturnType<typeof repository.findActiveRenderModesByTarget>
      >;

      beforeEach(async () => {
        jest
          .spyOn(repository, 'findActivePackageIdsByTarget')
          .mockResolvedValue([]);

        result = await repository.findActiveRenderModesByTarget(
          organizationId,
          targetId,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });
    });
  });

  describe('findOutdatedDeploymentsBySpace', () => {
    const spaceId = createSpaceId('space-1');
    const targetId1 = createTargetId('target-1');
    const targetId2 = createTargetId('target-2');
    const gitRepoId1 = createGitRepoId('git-repo-1');

    const createStandardVersion = (
      id: string,
      standardId: string,
      name: string,
      version = 1,
    ) => ({
      id: createStandardVersionId(id),
      standardId: createStandardId(standardId),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      description: `Description for ${name}`,
      version,
      summary: null,
      gitCommit: undefined,
      userId: createUserId('author-1'),
      scope: null,
    });

    const createRecipeVersion = (
      id: string,
      recipeId: string,
      name: string,
      version = 1,
    ) => ({
      id: createRecipeVersionId(id),
      recipeId: createRecipeId(recipeId),
      name,
      slug: name.toLowerCase().replace(/ /g, '-'),
      content: `Content for ${name}`,
      version,
      summary: null,
      userId: null,
    });

    const createDistributionForTarget = (
      id: string,
      createdAt: string,
      tgtId: string,
      tgtName: string,
      gRepoId: string,
      distributedPackages: Distribution['distributedPackages'],
    ): Distribution => ({
      id: createDistributionId(id),
      organizationId,
      authorId: createUserId('author-1'),
      status: DistributionStatus.success,
      target: {
        id: createTargetId(tgtId),
        name: tgtName,
        path: '/',
        gitRepoId: createGitRepoId(gRepoId),
      },
      distributedPackages,
      createdAt,
      renderModes: [],
      source: 'cli',
    });

    describe('with standards and recipes across multiple targets', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One', 2);
      const rv1 = createRecipeVersion('rv-1', 'recipe-1', 'Recipe One', 3);
      const sv2 = createStandardVersion('sv-2', 'std-2', 'Standard Two', 1);

      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        const dist1 = createDistributionForTarget(
          'dist-1',
          '2024-01-02T00:00:00Z',
          'target-1',
          'Target One',
          'git-repo-1',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1],
              recipeVersions: [rv1],
              skillVersions: [],
            },
          ],
        );

        const dist2 = createDistributionForTarget(
          'dist-2',
          '2024-01-03T00:00:00Z',
          'target-2',
          'Target Two',
          'git-repo-2',
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [sv2],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([dist1, dist2]);

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns entries for both targets', () => {
        expect(result).toHaveLength(2);
      });

      it('includes first target in results', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1).toBeDefined();
      });

      it('sets correct target name for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.targetName).toBe('Target One');
      });

      it('sets correct gitRepoId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.gitRepoId).toBe(gitRepoId1);
      });

      it('includes one standard for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards).toHaveLength(1);
      });

      it('sets correct standard artifactId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards[0].artifactId).toBe(sv1.standardId);
      });

      it('sets correct standard deployedVersion for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards[0].deployedVersion).toBe(2);
      });

      it('includes one recipe for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes).toHaveLength(1);
      });

      it('sets correct recipe artifactId for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].artifactId).toBe(rv1.recipeId);
      });

      it('sets correct recipe deployedVersion for first target', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.recipes[0].deployedVersion).toBe(3);
      });

      it('includes one standard for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.standards).toHaveLength(1);
      });

      it('sets correct standard artifactId for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.standards[0].artifactId).toBe(sv2.standardId);
      });

      it('includes no recipes for second target', () => {
        const target2 = result.find((r) => r.targetId === targetId2);
        expect(target2!.recipes).toHaveLength(0);
      });
    });

    describe('with removed packages', () => {
      const sv1 = createStandardVersion('sv-1', 'std-1', 'Standard One', 1);
      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        const addDist = createDistributionForTarget(
          'dist-1',
          '2024-01-01T00:00:00Z',
          'target-1',
          'Target One',
          'git-repo-1',
          [
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
        );

        const removeDist = createDistributionForTarget(
          'dist-2',
          '2024-01-02T00:00:00Z',
          'target-1',
          'Target One',
          'git-repo-1',
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

        mockQueryBuilder.getMany.mockResolvedValue([removeDist, addDist]);

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('excludes artifacts from removed packages', () => {
        expect(result).toHaveLength(0);
      });
    });

    describe('with no distributions', () => {
      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        mockQueryBuilder.getMany.mockResolvedValue([]);

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });
    });

    describe('with duplicate standard versions across packages', () => {
      const sv1v1 = createStandardVersion(
        'sv-1-v1',
        'std-1',
        'Standard One v1',
        1,
      );
      const sv1v2 = createStandardVersion(
        'sv-1-v2',
        'std-1',
        'Standard One v2',
        2,
      );

      let result: OutdatedDeploymentsByTarget[];

      beforeEach(async () => {
        const dist1 = createDistributionForTarget(
          'dist-2',
          '2024-01-02T00:00:00Z',
          'target-1',
          'Target One',
          'git-repo-1',
          [
            {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: packageId1,
              operation: 'add',
              standardVersions: [sv1v2],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        const dist2 = createDistributionForTarget(
          'dist-1',
          '2024-01-01T00:00:00Z',
          'target-1',
          'Target One',
          'git-repo-1',
          [
            {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId2,
              operation: 'add',
              standardVersions: [sv1v1],
              recipeVersions: [],
              skillVersions: [],
            },
          ],
        );

        mockQueryBuilder.getMany.mockResolvedValue([dist1, dist2]);

        result = await repository.findOutdatedDeploymentsBySpace(
          organizationId,
          spaceId,
        );
      });

      it('keeps only one standard after deduplication', () => {
        const target1 = result.find((r) => r.targetId === targetId1);
        expect(target1!.standards).toHaveLength(1);
      });

      it('keeps the most recent version after deduplication', () => {
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

    it('drops successful removes and failed adds', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([
        rawRow(packageId1, 'remove', DistributionStatus.success),
        rawRow(packageId2, 'add', DistributionStatus.failure),
      ]);

      const result =
        await repository.findActivePackageOperationsBySpace(spaceId);

      expect(result).toEqual([]);
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

    it('orders by (target_id, package_id, createdAt DESC) so DISTINCT ON keeps the latest', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      await repository.findActivePackageOperationsBySpace(spaceId);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'distribution.target_id',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'distributedPackage.package_id',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'distribution.createdAt',
        'DESC',
      );
    });

    it('joins distributedPackages and package without selecting them', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

      await repository.findActivePackageOperationsBySpace(spaceId);

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'distribution.distributedPackages',
        'distributedPackage',
      );
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'distributedPackage.package',
        'package',
      );
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
});
