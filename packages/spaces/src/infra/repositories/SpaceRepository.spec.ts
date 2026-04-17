import { Repository } from 'typeorm';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import { OrganizationSchema } from '@packmind/accounts';
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
import { PackmindLogger } from '@packmind/logger';
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
});
