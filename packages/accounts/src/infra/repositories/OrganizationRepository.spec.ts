import {
  createTestDatasourceFixture,
  itHandlesDuplicateKeys,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { OrganizationRepository } from './OrganizationRepository';
import { createOrganizationId, Organization } from '@packmind/types';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { organizationFactory } from '../../../test';
import { PackmindLogger } from '@packmind/logger';

describe('OrganizationRepository', () => {
  const fixture = createTestDatasourceFixture([OrganizationSchema]);

  let organizationRepository: OrganizationRepository;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    logger = stubLogger();
    organizationRepository = new OrganizationRepository(
      fixture.datasource.getRepository(OrganizationSchema),
      logger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<Organization>({
    entityFactory: () => organizationFactory(),
    getRepository: () => organizationRepository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(OrganizationSchema).findOne({
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
    it('returns the added organization', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });

      const result = await organizationRepository.add(organization);

      expect(result).toEqual(organization);
    });
  });

  describe('.findById', () => {
    it('returns the organization matching the given ID', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });
      await organizationRepository.add(organization);

      const result = await organizationRepository.findById(organization.id);

      expect(result).toEqual(organization);
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

  describe('.findBySlug', () => {
    it('returns the organization matching the given slug', async () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });
      await organizationRepository.add(organization);

      const result = await organizationRepository.findBySlug(organization.slug);

      expect(result).toEqual(organization);
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

    describe('when organizations exist', () => {
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

        expect(result).toEqual(
          expect.arrayContaining([organization1, organization2]),
        );
      });
    });
  });
});
