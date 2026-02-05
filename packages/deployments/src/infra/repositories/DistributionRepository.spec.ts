import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createDistributionId,
  createDistributedPackageId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  Distribution,
  DistributionStatus,
  RenderMode,
} from '@packmind/types';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DistributionRepository } from './DistributionRepository';

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
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
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
});
