import { Repository, SelectQueryBuilder } from 'typeorm';
import { TargetRepository } from './TargetRepository';
import {
  Target,
  createTargetId,
  createGitRepoId,
  createOrganizationId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';

describe('TargetRepository', () => {
  let repository: TargetRepository;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Target>>;
  let mockTypeOrmRepository: jest.Mocked<Repository<Target>>;

  const organizationId = createOrganizationId(uuidv4());
  const targetId1 = createTargetId(uuidv4());
  const targetId2 = createTargetId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());

  const target1: Target = {
    id: targetId1,
    name: 'production',
    path: '/',
    gitRepoId,
  };

  const target2: Target = {
    id: targetId2,
    name: 'staging',
    path: '/staging/',
    gitRepoId,
  };

  beforeEach(() => {
    mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Target>>;

    mockTypeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<Repository<Target>>;

    repository = new TargetRepository(mockTypeOrmRepository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIdsInOrganization', () => {
    describe('when all targets belong to the organization', () => {
      beforeEach(() => {
        mockQueryBuilder.getMany.mockResolvedValue([target1, target2]);
      });

      it('returns the matching targets', async () => {
        const result = await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(result).toEqual([target1, target2]);
      });

      it('joins through gitRepo to gitProvider for organization scoping', async () => {
        await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'target.gitRepo',
          'gitRepo',
        );
      });

      it('joins gitProvider for organization filtering', async () => {
        await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'gitRepo.provider',
          'gitProvider',
        );
      });

      it('filters by organization id', async () => {
        await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'gitProvider.organizationId = :organizationId',
          { organizationId },
        );
      });

      it('filters by target ids using IN clause', async () => {
        await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'target.id IN (:...targetIds)',
          { targetIds: [targetId1, targetId2] },
        );
      });
    });

    describe('when some targets do not belong to the organization', () => {
      beforeEach(() => {
        mockQueryBuilder.getMany.mockResolvedValue([target1]);
      });

      it('returns only the matching targets', async () => {
        const result = await repository.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(result).toEqual([target1]);
      });
    });

    describe('when the query fails', () => {
      beforeEach(() => {
        mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));
      });

      it('propagates the error', async () => {
        await expect(
          repository.findByIdsInOrganization([targetId1], organizationId),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
