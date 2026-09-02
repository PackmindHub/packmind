import { EntitySchema, In, Repository } from 'typeorm';
import { CreatedBy, UserId } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { AbstractRepository } from './AbstractRepository';

type TestEntity = { id: string; name: string };

class ConcreteRepository extends AbstractRepository<TestEntity> {
  protected loggableEntity(entity: TestEntity): Partial<TestEntity> {
    return { id: entity.id };
  }

  exposedGetCreatedByMany(userIds: string[]): Promise<Map<UserId, CreatedBy>> {
    return this.getCreatedByMany(userIds);
  }
}

describe('AbstractRepository', () => {
  let repository: ConcreteRepository;
  let mockUserRepository: { find: jest.Mock };
  let mockGetRepository: jest.Mock;

  beforeEach(() => {
    mockUserRepository = { find: jest.fn().mockResolvedValue([]) };
    mockGetRepository = jest.fn().mockReturnValue(mockUserRepository);

    const mockTypeOrmRepository = {
      manager: { getRepository: mockGetRepository },
    } as unknown as jest.Mocked<Repository<TestEntity>>;

    repository = new ConcreteRepository(
      'testEntity',
      mockTypeOrmRepository,
      {} as EntitySchema,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCreatedByMany', () => {
    it('issues a single query for many user ids', async () => {
      await repository.exposedGetCreatedByMany(['user-1', 'user-2', 'user-3']);

      expect(mockUserRepository.find).toHaveBeenCalledTimes(1);
    });

    it('issues a single query when the same author repeats', async () => {
      await repository.exposedGetCreatedByMany(
        Array.from({ length: 40 }, (_, index) =>
          index % 2 === 0 ? 'user-1' : 'user-2',
        ),
      );

      expect(mockUserRepository.find).toHaveBeenCalledTimes(1);
    });

    it('queries the distinct user ids only', async () => {
      await repository.exposedGetCreatedByMany([
        'user-1',
        'user-2',
        'user-1',
        'user-2',
        'user-1',
      ]);

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { id: In(['user-1', 'user-2']) },
        select: ['id', 'email', 'displayName'],
      });
    });

    it('looks the authors up on the User repository', async () => {
      await repository.exposedGetCreatedByMany(['user-1']);

      expect(mockGetRepository).toHaveBeenCalledWith('User');
    });

    it('maps each user to its display name', async () => {
      mockUserRepository.find.mockResolvedValue([
        { id: 'user-1', email: 'alice@packmind.com', displayName: 'Alice' },
      ]);

      const createdBy = await repository.exposedGetCreatedByMany(['user-1']);

      expect(createdBy.get('user-1' as UserId)).toEqual({
        userId: 'user-1',
        displayName: 'Alice',
      });
    });

    it('falls back to the email local part when the display name is null', async () => {
      mockUserRepository.find.mockResolvedValue([
        { id: 'user-1', email: 'alice@packmind.com', displayName: null },
      ]);

      const createdBy = await repository.exposedGetCreatedByMany(['user-1']);

      expect(createdBy.get('user-1' as UserId)?.displayName).toBe('alice');
    });

    describe('when no user id is given', () => {
      it('does not query the database', async () => {
        await repository.exposedGetCreatedByMany([]);

        expect(mockUserRepository.find).not.toHaveBeenCalled();
      });

      it('returns an empty map', async () => {
        const createdBy = await repository.exposedGetCreatedByMany([]);

        expect(createdBy.size).toBe(0);
      });
    });

    describe('when a user id cannot be resolved', () => {
      beforeEach(() => {
        mockUserRepository.find.mockResolvedValue([
          { id: 'user-1', email: 'alice@packmind.com', displayName: 'Alice' },
        ]);
      });

      it('omits it from the map', async () => {
        const createdBy = await repository.exposedGetCreatedByMany([
          'user-1',
          'user-missing',
        ]);

        expect(createdBy.has('user-missing' as UserId)).toBe(false);
      });

      it('still resolves the other authors', async () => {
        const createdBy = await repository.exposedGetCreatedByMany([
          'user-1',
          'user-missing',
        ]);

        expect(createdBy.get('user-1' as UserId)?.displayName).toBe('Alice');
      });
    });

    describe('when the query fails', () => {
      beforeEach(() => {
        mockUserRepository.find.mockRejectedValue(new Error('boom'));
      });

      it('does not throw', async () => {
        await expect(
          repository.exposedGetCreatedByMany(['user-1']),
        ).resolves.toBeInstanceOf(Map);
      });

      it('returns an empty map', async () => {
        const createdBy = await repository.exposedGetCreatedByMany(['user-1']);

        expect(createdBy.size).toBe(0);
      });
    });
  });
});
