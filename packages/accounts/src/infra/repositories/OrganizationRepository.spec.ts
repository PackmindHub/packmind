import { DataSource } from 'typeorm';
import { OrganizationRepository } from './OrganizationRepository';
import {
  createOrganizationId,
  Organization,
} from '../../domain/entities/Organization';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import {
  makeTestDatasource,
  itHandlesSoftDelete,
  itHandlesDuplicateKeys,
} from '@packmind/shared/test';
import { organizationFactory } from '../../../test';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('OrganizationRepository', () => {
  let dataSource: DataSource;
  let organizationRepository: OrganizationRepository;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(async () => {
    logger = stubLogger();
    dataSource = await makeTestDatasource([OrganizationSchema]);
    await dataSource.initialize();
    await dataSource.synchronize();
    organizationRepository = new OrganizationRepository(
      dataSource.getRepository(OrganizationSchema),
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  itHandlesSoftDelete<Organization>({
    entityFactory: () => organizationFactory(),
    getRepository: () => organizationRepository,
    queryDeletedEntity: async (id) =>
      dataSource.getRepository(OrganizationSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  itHandlesDuplicateKeys<Organization>({
    entityFactory: (overrides) => organizationFactory(overrides),
    getRepository: () => organizationRepository,
    duplicateFields: ['name', 'slug'],
    expectedErrorMessage: (organization) =>
      `Organization name '${organization.name}' already exists`,
  });

  describe('.add', () => {
    it('adds a new organization successfully', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });

      const result = await organizationRepository.add(organization);

      expect(result).toEqual(organization);
      expect(result.id).toBe(organization.id);
      expect(result.name).toBe(organization.name);
      expect(result.slug).toBe(organization.slug);
    });
  });

  describe('.findById', () => {
    it('finds organization by ID', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });
      await organizationRepository.add(organization);

      const result = await organizationRepository.findById(organization.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(organization.id);
      expect(result?.name).toBe(organization.name);
      expect(result?.slug).toBe(organization.slug);
    });

    describe('when organization is not found', () => {
      it('returns null', async () => {
        const nonExistentId = createOrganizationId(
          '123e4567-e89b-12d3-a456-426614174999',
        );

        const result = await organizationRepository.findById(nonExistentId);

        expect(result).toBeNull();
      });
    });
  });

  describe('.findByName', () => {
    it('finds organization by name', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });
      await organizationRepository.add(organization);

      const result = await organizationRepository.findByName(organization.name);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(organization.id);
      expect(result?.name).toBe(organization.name);
      expect(result?.slug).toBe(organization.slug);
    });

    describe('when organization name is not found', () => {
      it('returns null', async () => {
        const nonExistentName = 'Non-existent Organization';

        const result = await organizationRepository.findByName(nonExistentName);

        expect(result).toBeNull();
      });
    });
  });

  describe('.findBySlug', () => {
    it('finds organization by slug', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });
      await organizationRepository.add(organization);

      const result = await organizationRepository.findBySlug(organization.slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(organization.id);
      expect(result?.name).toBe(organization.name);
      expect(result?.slug).toBe(organization.slug);
    });

    describe('when organization slug is not found', () => {
      it('returns null', async () => {
        const nonExistentSlug = 'non-existent-organization';

        const result = await organizationRepository.findBySlug(nonExistentSlug);

        expect(result).toBeNull();
      });
    });
  });

  describe('.list', () => {
    describe('when no organizations exist', () => {
      it('returns empty array', async () => {
        const result = await organizationRepository.list();

        expect(result).toEqual([]);
      });
    });

    it('returns all organizations', async () => {
      const organization1 = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
        name: 'Tech Corporation',
        slug: 'tech-corporation',
      });

      const organization2 = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
        name: 'Marketing Inc',
        slug: 'marketing-inc',
      });

      await organizationRepository.add(organization1);
      await organizationRepository.add(organization2);

      const result = await organizationRepository.list();

      expect(result).toHaveLength(2);
      expect(result.map((o) => o.name)).toContain('Tech Corporation');
      expect(result.map((o) => o.name)).toContain('Marketing Inc');
    });
  });
});
