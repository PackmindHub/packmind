import { Repository } from 'typeorm';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { OrganizationSchema } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '../schemas/SpaceSchema';
import { spaceFactory } from '../../../test';
import {
  createOrganizationId,
  Organization,
  Space,
  SpaceType,
  WithSoftDelete,
  WithTimestamps,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { SpaceRepository } from './SpaceRepository';

describe('SpaceRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    SpaceSchema,
  ]);

  let repository: SpaceRepository;
  let ormRepository: Repository<WithSoftDelete<WithTimestamps<Space>>>;
  let organization: Organization;
  let logger: jest.Mocked<PackmindLogger>;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    logger = stubLogger();
    ormRepository = fixture.datasource.getRepository(SpaceSchema);
    repository = new SpaceRepository(ormRepository, logger);

    organization = await fixture.datasource
      .getRepository(OrganizationSchema)
      .save({
        id: createOrganizationId(uuidv4()),
        name: 'Test Organization',
        slug: 'test-org',
      });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('updateFields', () => {
    it('persists a color change to the database', async () => {
      const saved = await ormRepository.save(
        spaceFactory({ organizationId: organization.id, color: 'blue' }),
      );

      await repository.updateFields(saved.id, { color: 'purple' });

      const reloaded = await ormRepository.findOneByOrFail({ id: saved.id });
      expect(reloaded.color).toBe('purple');
    });

    it('leaves color untouched when not provided', async () => {
      const saved = await ormRepository.save(
        spaceFactory({
          organizationId: organization.id,
          color: 'blue',
          name: 'Original',
        }),
      );

      await repository.updateFields(saved.id, { name: 'Renamed' });

      const reloaded = await ormRepository.findOneByOrFail({ id: saved.id });
      expect(reloaded.name).toBe('Renamed');
      expect(reloaded.color).toBe('blue');
    });

    it('updates multiple fields in a single call', async () => {
      const saved = await ormRepository.save(
        spaceFactory({
          organizationId: organization.id,
          color: 'blue',
          name: 'Original',
          type: SpaceType.open,
        }),
      );

      await repository.updateFields(saved.id, {
        name: 'Renamed',
        color: 'green',
        type: SpaceType.restricted,
      });

      const reloaded = await ormRepository.findOneByOrFail({ id: saved.id });
      expect(reloaded.name).toBe('Renamed');
      expect(reloaded.color).toBe('green');
      expect(reloaded.type).toBe(SpaceType.restricted);
    });
  });

  describe('findOrgPagePaginated', () => {
    it('returns the page of spaces ordered by isDefaultSpace DESC then createdAt ASC, plus totalCount', async () => {
      const defaultSpace = await ormRepository.save(
        spaceFactory({
          organizationId: organization.id,
          slug: 'space-default',
          isDefaultSpace: true,
        }),
      );
      const oldest = await ormRepository.save({
        ...spaceFactory({
          organizationId: organization.id,
          slug: 'space-oldest',
        }),
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });
      const middle = await ormRepository.save({
        ...spaceFactory({
          organizationId: organization.id,
          slug: 'space-middle',
        }),
        createdAt: new Date('2025-02-01T00:00:00Z'),
      });
      const newest = await ormRepository.save({
        ...spaceFactory({
          organizationId: organization.id,
          slug: 'space-newest',
        }),
        createdAt: new Date('2025-03-01T00:00:00Z'),
      });

      const result = await repository.findOrgPagePaginated(
        organization.id,
        1,
        8,
      );

      expect(result.totalCount).toBe(4);
      expect(result.items.map((s) => s.id)).toEqual([
        defaultSpace.id,
        oldest.id,
        middle.id,
        newest.id,
      ]);
    });

    it('respects pagination offsets', async () => {
      for (let i = 0; i < 10; i++) {
        await ormRepository.save(
          spaceFactory({
            organizationId: organization.id,
            slug: `space-${i}`,
          }),
        );
      }

      const page1 = await repository.findOrgPagePaginated(
        organization.id,
        1,
        4,
      );
      const page2 = await repository.findOrgPagePaginated(
        organization.id,
        2,
        4,
      );
      const page3 = await repository.findOrgPagePaginated(
        organization.id,
        3,
        4,
      );

      expect(page1.items).toHaveLength(4);
      expect(page2.items).toHaveLength(4);
      expect(page3.items).toHaveLength(2);
      const allIds = [...page1.items, ...page2.items, ...page3.items].map(
        (s) => s.id,
      );
      expect(new Set(allIds).size).toBe(10);
      expect(page1.totalCount).toBe(10);
      expect(page2.totalCount).toBe(10);
      expect(page3.totalCount).toBe(10);
    });

    it('returns empty items but accurate totalCount when page is past last', async () => {
      await ormRepository.save(
        spaceFactory({ organizationId: organization.id, slug: 'space-only' }),
      );

      const result = await repository.findOrgPagePaginated(
        organization.id,
        99,
        8,
      );

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(1);
    });

    it('does not return spaces from other organizations', async () => {
      const otherOrg = await fixture.datasource
        .getRepository(OrganizationSchema)
        .save({
          id: createOrganizationId(uuidv4()),
          name: 'Other Organization',
          slug: 'other-org',
        });

      await ormRepository.save(
        spaceFactory({ organizationId: organization.id, slug: 'space-mine' }),
      );
      await ormRepository.save(
        spaceFactory({ organizationId: otherOrg.id, slug: 'space-other' }),
      );

      const result = await repository.findOrgPagePaginated(
        organization.id,
        1,
        8,
      );

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].organizationId).toBe(organization.id);
    });

    it('excludes soft-deleted spaces from items and totalCount', async () => {
      const alive = await ormRepository.save(
        spaceFactory({ organizationId: organization.id, slug: 'space-alive' }),
      );
      const toDelete = await ormRepository.save(
        spaceFactory({
          organizationId: organization.id,
          slug: 'space-deleted',
        }),
      );
      await repository.deleteById(toDelete.id, 'tester');

      const result = await repository.findOrgPagePaginated(
        organization.id,
        1,
        8,
      );

      expect(result.totalCount).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(alive.id);
    });
  });
});
