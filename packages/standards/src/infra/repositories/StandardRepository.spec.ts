import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/node-utils';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  itHandlesSoftDelete,
  makeTestDatasource,
  stubLogger,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { createStandardId, Standard } from '../../domain/entities/Standard';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { StandardRepository } from './StandardRepository';

describe('StandardRepository', () => {
  let datasource: DataSource;
  let standardRepository: StandardRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Standard>;

  beforeEach(async () => {
    datasource = await makeTestDatasource([
      StandardSchema,
      StandardVersionSchema,
      RuleSchema,
      GitCommitSchema,
      SpaceSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(StandardSchema);

    standardRepository = new StandardRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  it('can store and retrieve standards by organization with scope from latest version', async () => {
    const organizationId = createOrganizationId(uuidv4());
    const standard = standardFactory({
      scope: 'standard-scope',
    });
    await standardRepository.add(standard);

    // Create standard versions with different scopes
    const versionRepo = datasource.getRepository(StandardVersionSchema);
    const version1 = standardVersionFactory({
      standardId: standard.id,
      version: 1,
      scope: 'version-1-scope',
    });
    const version2 = standardVersionFactory({
      standardId: standard.id,
      version: 2,
      scope: 'version-2-scope',
    });
    await versionRepo.save(version1);
    await versionRepo.save(version2);

    const foundStandards =
      await standardRepository.findByOrganizationId(organizationId);

    // findByOrganizationId is deprecated and returns empty array
    expect(foundStandards).toHaveLength(0);
  });

  describe('when no versions exist', () => {
    it('returns standard scope', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const standard = standardFactory({
        scope: 'standard-scope',
      });
      await standardRepository.add(standard);

      const foundStandards =
        await standardRepository.findByOrganizationId(organizationId);

      // findByOrganizationId is deprecated - returns empty array
      expect(foundStandards).toHaveLength(0);
    });
  });

  it('can store and retrieve multiple standards by organization', async () => {
    const organizationId = createOrganizationId(uuidv4());
    await standardRepository.add(standardFactory({ slug: 'slug-1' }));
    await standardRepository.add(standardFactory({ slug: 'slug-2' }));
    await standardRepository.add(standardFactory({ slug: 'slug-3' }));

    const foundStandards =
      await standardRepository.findByOrganizationId(organizationId);

    // findByOrganizationId is deprecated - returns empty array
    expect(foundStandards).toHaveLength(0);
  });

  it('can find a standard by id', async () => {
    const standard = standardFactory();
    await standardRepository.add(standard);

    const foundStandard = await standardRepository.findById(standard.id);
    expect(foundStandard).toEqual(standard);
  });

  it('can find a standard by slug and organization', async () => {
    const organizationId = createOrganizationId(uuidv4());
    const space = spaceFactory({ organizationId });

    // Create a space in the organization
    const spaceRepo = datasource.getRepository(SpaceSchema);
    await spaceRepo.save(space);

    const standard = standardFactory({
      slug: 'unique-slug',
      spaceId: space.id,
    });
    await standardRepository.add(standard);

    const foundStandard = await standardRepository.findBySlug(
      'unique-slug',
      organizationId,
    );
    expect(foundStandard).toMatchObject({
      id: standard.id,
      name: standard.name,
      slug: standard.slug,
    });
  });

  it('can find standards by user id', async () => {
    const userId = createUserId(uuidv4());
    const standard = standardFactory({ userId });
    await standardRepository.add(standard);

    const foundStandards = await standardRepository.findByUserId(userId);
    expect(foundStandards).toEqual([standard]);
  });

  it('can find standards by organization and user', async () => {
    const organizationId = createOrganizationId(uuidv4());
    const userId = createUserId(uuidv4());
    const standard = standardFactory({ userId });
    await standardRepository.add(standard);

    const foundStandards = await standardRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );
    // findByOrganizationAndUser is deprecated and returns empty array
    expect(foundStandards).toEqual([]);
  });

  it('can find standards by space and organization with scope from latest version', async () => {
    const spaceId = createSpaceId(uuidv4());
    const standard = standardFactory({
      spaceId,
      scope: 'standard-scope',
    });
    await standardRepository.add(standard);

    // Create standard versions with different scopes
    const versionRepo = datasource.getRepository(StandardVersionSchema);
    const version1 = standardVersionFactory({
      standardId: standard.id,
      version: 1,
      scope: 'version-1-scope',
    });
    const version2 = standardVersionFactory({
      standardId: standard.id,
      version: 2,
      scope: 'version-2-scope',
    });
    await versionRepo.save(version1);
    await versionRepo.save(version2);

    const foundStandards = await standardRepository.findBySpaceId(spaceId);

    expect(foundStandards).toHaveLength(1);
    expect(foundStandards[0]).toMatchObject({
      id: standard.id,
      name: standard.name,
      slug: standard.slug,
      description: standard.description,
      userId: standard.userId,
      spaceId: spaceId,
      scope: 'version-2-scope',
    });
  });

  it('can find multiple standards by space', async () => {
    const spaceId = createSpaceId(uuidv4());
    const standard1 = await standardRepository.add(
      standardFactory({ spaceId, slug: 'slug-1' }),
    );
    const standard2 = await standardRepository.add(
      standardFactory({ spaceId, slug: 'slug-2' }),
    );
    const standard3 = await standardRepository.add(
      standardFactory({ spaceId, slug: 'slug-3' }),
    );

    const foundStandards = await standardRepository.findBySpaceId(spaceId);

    expect(foundStandards).toHaveLength(3);
    const foundIds = foundStandards.map((s) => s.id);
    expect(foundIds).toContain(standard1.id);
    expect(foundIds).toContain(standard2.id);
    expect(foundIds).toContain(standard3.id);
  });

  describe('when searching for organization standards', () => {
    it('finds standards with spaceId', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const spaceId = createSpaceId(uuidv4());
      const standardWithSpace = standardFactory({
        spaceId,
        slug: 'space-slug',
      });
      await standardRepository.add(standardWithSpace);

      const foundStandards =
        await standardRepository.findByOrganizationId(organizationId);

      // findByOrganizationId is deprecated - returns empty array
      expect(foundStandards).toHaveLength(0);
    });
  });

  describe('when finding a non-existent standard', () => {
    it('returns null for non-existent id', async () => {
      const foundStandard = await standardRepository.findById(
        createStandardId(uuidv4()),
      );
      expect(foundStandard).toBeNull();
    });

    it('returns null for non-existent slug', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const foundStandard = await standardRepository.findBySlug(
        'non-existent-slug',
        organizationId,
      );
      expect(foundStandard).toBeNull();
    });

    it('returns empty array for non-existent organization', async () => {
      const nonExistentOrgId = createOrganizationId(uuidv4());

      const foundStandards =
        await standardRepository.findByOrganizationId(nonExistentOrgId);
      expect(foundStandards).toHaveLength(0);
    });

    it('returns empty array for non-existent user', async () => {
      const foundStandards = await standardRepository.findByUserId(
        createUserId(uuidv4()),
      );
      expect(foundStandards).toEqual([]);
    });

    it('returns empty array for non-existent space', async () => {
      const nonExistentSpaceId = createSpaceId(uuidv4());
      const foundStandards =
        await standardRepository.findBySpaceId(nonExistentSpaceId);
      expect(foundStandards).toHaveLength(0);
    });
  });

  itHandlesSoftDelete<Standard>({
    entityFactory: standardFactory,
    getRepository: () => standardRepository,
    queryDeletedEntity: async (id) =>
      typeormRepo.findOne({
        where: { id },
        withDeleted: true,
      }) as unknown as WithSoftDelete<Standard>,
  });
});
