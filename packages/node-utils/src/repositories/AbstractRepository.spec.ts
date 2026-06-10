import { In, Repository, EntitySchema } from 'typeorm';
import { AbstractRepository } from './AbstractRepository';
import { stubLogger } from '@packmind/test-utils';

type TestEntity = { id: string; name: string };

class ConcreteRepository extends AbstractRepository<TestEntity> {
  protected loggableEntity(entity: TestEntity): Partial<TestEntity> {
    return { id: entity.id };
  }
}

describe('AbstractRepository', () => {
  let repository: ConcreteRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<TestEntity>>;

  beforeEach(() => {
    mockTypeOrmRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<TestEntity>>;

    repository = new ConcreteRepository(
      'testEntity',
      mockTypeOrmRepository,
      {} as EntitySchema<
        TestEntity & { deletedAt: Date | null; deletedBy: string | null }
      >,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIds', () => {
    describe('when no ids are provided', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByIds([]);

        expect(result).toEqual([]);
      });

      it('does not query the database', async () => {
        await repository.findByIds([]);

        expect(mockTypeOrmRepository.find).not.toHaveBeenCalled();
      });
    });

    describe('when ids are provided', () => {
      const entities = [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ];

      beforeEach(() => {
        mockTypeOrmRepository.find.mockResolvedValue(entities);
      });

      it('queries with In(ids) excluding soft-deleted rows by default', async () => {
        await repository.findByIds(['a', 'b', 'c']);

        expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
          where: { id: In(['a', 'b', 'c']) },
          withDeleted: false,
        });
      });

      it('returns the matching rows', async () => {
        const result = await repository.findByIds(['a', 'b', 'c']);

        expect(result).toEqual(entities);
      });
    });

    describe('when includeDeleted is set', () => {
      beforeEach(() => {
        mockTypeOrmRepository.find.mockResolvedValue([]);
      });

      it('includes soft-deleted rows', async () => {
        await repository.findByIds(['a'], { includeDeleted: true });

        expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
          where: { id: In(['a']) },
          withDeleted: true,
        });
      });
    });

    describe('when some ids do not exist', () => {
      it('returns only the rows that exist', async () => {
        const found = [{ id: 'a', name: 'A' }];
        mockTypeOrmRepository.find.mockResolvedValue(found);

        const result = await repository.findByIds(['a', 'missing']);

        expect(result).toEqual(found);
      });
    });
  });
});
