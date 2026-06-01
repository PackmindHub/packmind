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

    describe('when color is not provided', () => {
      let reloaded: Awaited<ReturnType<typeof ormRepository.findOneByOrFail>>;

      beforeEach(async () => {
        const saved = await ormRepository.save(
          spaceFactory({
            organizationId: organization.id,
            color: 'blue',
            name: 'Original',
          }),
        );
        await repository.updateFields(saved.id, { name: 'Renamed' });
        reloaded = await ormRepository.findOneByOrFail({ id: saved.id });
      });

      it('still applies the provided field updates', () => {
        expect(reloaded.name).toBe('Renamed');
      });

      it('leaves color untouched', () => {
        expect(reloaded.color).toBe('blue');
      });
    });

    describe('when updating multiple fields', () => {
      let reloaded: Awaited<ReturnType<typeof ormRepository.findOneByOrFail>>;

      beforeEach(async () => {
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
        reloaded = await ormRepository.findOneByOrFail({ id: saved.id });
      });

      it('persists the name', () => {
        expect(reloaded.name).toBe('Renamed');
      });

      it('persists the color', () => {
        expect(reloaded.color).toBe('green');
      });

      it('persists the type', () => {
        expect(reloaded.type).toBe(SpaceType.restricted);
      });
    });
  });

  describe('findOrgPagePaginated', () => {
    describe('when ordering spaces', () => {
      let result: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;
      let defaultSpaceId: Space['id'];
      let oldestId: Space['id'];
      let middleId: Space['id'];
      let newestId: Space['id'];

      beforeEach(async () => {
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

        defaultSpaceId = defaultSpace.id;
        oldestId = oldest.id;
        middleId = middle.id;
        newestId = newest.id;

        result = await repository.findOrgPagePaginated(organization.id, 1, 8);
      });

      it('returns the correct totalCount', () => {
        expect(result.totalCount).toBe(4);
      });

      it('orders items by isDefaultSpace DESC then createdAt ASC', () => {
        expect(result.items.map((s) => s.id)).toEqual([
          defaultSpaceId,
          oldestId,
          middleId,
          newestId,
        ]);
      });
    });

    describe('when paginating through spaces', () => {
      let page1: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;
      let page2: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;
      let page3: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;

      beforeEach(async () => {
        for (let i = 0; i < 10; i++) {
          await ormRepository.save(
            spaceFactory({
              organizationId: organization.id,
              slug: `space-${i}`,
            }),
          );
        }

        page1 = await repository.findOrgPagePaginated(organization.id, 1, 4);
        page2 = await repository.findOrgPagePaginated(organization.id, 2, 4);
        page3 = await repository.findOrgPagePaginated(organization.id, 3, 4);
      });

      it('returns 4 items on page 1', () => {
        expect(page1.items).toHaveLength(4);
      });

      it('returns 4 items on page 2', () => {
        expect(page2.items).toHaveLength(4);
      });

      it('returns 2 items on page 3', () => {
        expect(page3.items).toHaveLength(2);
      });

      it('returns non-overlapping items across pages', () => {
        const allIds = [...page1.items, ...page2.items, ...page3.items].map(
          (s) => s.id,
        );
        expect(new Set(allIds).size).toBe(10);
      });

      it('reports correct totalCount on page 1', () => {
        expect(page1.totalCount).toBe(10);
      });

      it('reports correct totalCount on page 2', () => {
        expect(page2.totalCount).toBe(10);
      });

      it('reports correct totalCount on page 3', () => {
        expect(page3.totalCount).toBe(10);
      });
    });

    describe('when page is past the last page', () => {
      let result: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;

      beforeEach(async () => {
        await ormRepository.save(
          spaceFactory({ organizationId: organization.id, slug: 'space-only' }),
        );
        result = await repository.findOrgPagePaginated(organization.id, 99, 8);
      });

      it('returns empty items', () => {
        expect(result.items).toEqual([]);
      });

      it('returns accurate totalCount', () => {
        expect(result.totalCount).toBe(1);
      });
    });

    describe('when the organization has spaces from other organizations', () => {
      let result: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;

      beforeEach(async () => {
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

        result = await repository.findOrgPagePaginated(organization.id, 1, 8);
      });

      it('returns only the correct organization totalCount', () => {
        expect(result.totalCount).toBe(1);
      });

      it('returns only one item', () => {
        expect(result.items).toHaveLength(1);
      });

      it('returns the item belonging to the correct organization', () => {
        expect(result.items[0].organizationId).toBe(organization.id);
      });
    });

    describe('when some spaces are soft-deleted', () => {
      let aliveId: Space['id'];
      let result: Awaited<ReturnType<typeof repository.findOrgPagePaginated>>;

      beforeEach(async () => {
        const alive = await ormRepository.save(
          spaceFactory({
            organizationId: organization.id,
            slug: 'space-alive',
          }),
        );
        const toDelete = await ormRepository.save(
          spaceFactory({
            organizationId: organization.id,
            slug: 'space-deleted',
          }),
        );
        await repository.deleteById(toDelete.id, 'tester');

        aliveId = alive.id;
        result = await repository.findOrgPagePaginated(organization.id, 1, 8);
      });

      it('excludes them from totalCount', () => {
        expect(result.totalCount).toBe(1);
      });

      it('excludes them from items', () => {
        expect(result.items).toHaveLength(1);
      });

      it('only includes the alive space', () => {
        expect(result.items[0].id).toBe(aliveId);
      });
    });
  });
});
