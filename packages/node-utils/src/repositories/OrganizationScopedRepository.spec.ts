import { SelectQueryBuilder, Repository, EntitySchema } from 'typeorm';
import { OrganizationScopedRepository } from './OrganizationScopedRepository';

type TestEntity = { id: string; name: string };

class ConcreteRepository extends OrganizationScopedRepository<TestEntity> {
  protected getEntityAlias(): string {
    return 'testEntity';
  }

  protected applyOrganizationScope(
    qb: SelectQueryBuilder<TestEntity>,
    organizationId: string,
  ): SelectQueryBuilder<TestEntity> {
    return qb
      .innerJoin('testEntity.relation', 'relation')
      .andWhere('relation.organizationId = :organizationId', {
        organizationId,
      });
  }

  protected loggableEntity(entity: TestEntity): Partial<TestEntity> {
    return { id: entity.id };
  }

  exposedCreateScopedQueryBuilder(
    organizationId: string,
  ): SelectQueryBuilder<TestEntity> {
    return this.createScopedQueryBuilder(organizationId);
  }
}

describe('OrganizationScopedRepository', () => {
  let repository: ConcreteRepository;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<TestEntity>>;
  let mockTypeOrmRepository: jest.Mocked<Repository<TestEntity>>;

  beforeEach(() => {
    mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TestEntity>>;

    mockTypeOrmRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<Repository<TestEntity>>;

    repository = new ConcreteRepository(
      'testEntity',
      mockTypeOrmRepository,
      {} as EntitySchema,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScopedQueryBuilder', () => {
    it('creates a query builder with the entity alias', () => {
      repository.exposedCreateScopedQueryBuilder('org-123');

      expect(mockTypeOrmRepository.createQueryBuilder).toHaveBeenCalledWith(
        'testEntity',
      );
    });

    it('applies inner join for organization scope', () => {
      repository.exposedCreateScopedQueryBuilder('org-123');

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'testEntity.relation',
        'relation',
      );
    });

    it('filters by organization id in the where clause', () => {
      repository.exposedCreateScopedQueryBuilder('org-123');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'relation.organizationId = :organizationId',
        { organizationId: 'org-123' },
      );
    });

    it('returns the scoped query builder', () => {
      const result = repository.exposedCreateScopedQueryBuilder('org-456');

      expect(result).toBe(mockQueryBuilder);
    });
  });
});
