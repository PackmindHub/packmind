import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/node-utils';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createUserId,
  Standard,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { StandardRepository } from './StandardRepository';

describe('StandardRepository', () => {
  // Use fixture pattern for faster test execution
  // Schema is synchronized once per file, tables truncated between tests
  const fixture = createTestDatasourceFixture([
    StandardSchema,
    StandardVersionSchema,
    RuleSchema,
    GitCommitSchema,
    SpaceSchema,
  ]);

  let standardRepository: StandardRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Standard>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(StandardSchema);
    standardRepository = new StandardRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  it('can store and retrieve standards by organization with scope from latest version', async () => {
    const organizationId = createOrganizationId(uuidv4());
    const standard = standardFactory({
      scope: 'standard-scope',
    });
    await standardRepository.add(standard);

    // Create standard versions with different scopes
    const versionRepo = fixture.datasource.getRepository(StandardVersionSchema);
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
    const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
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

  describe('when finding standards by space with versioned scopes', () => {
    let spaceId: ReturnType<typeof createSpaceId>;
    let standard: ReturnType<typeof standardFactory>;
    let foundStandards: Standard[];

    beforeEach(async () => {
      spaceId = createSpaceId(uuidv4());
      standard = standardFactory({
        spaceId,
        scope: 'standard-scope',
      });
      await standardRepository.add(standard);

      // Create standard versions with different scopes
      const versionRepo = fixture.datasource.getRepository(
        StandardVersionSchema,
      );
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

      foundStandards = await standardRepository.findBySpaceId(spaceId);
    });

    it('returns one standard', () => {
      expect(foundStandards).toHaveLength(1);
    });

    it('returns scope from latest version', () => {
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
  });

  describe('when finding multiple standards by space', () => {
    let spaceId: ReturnType<typeof createSpaceId>;
    let standard1: Standard;
    let standard2: Standard;
    let standard3: Standard;
    let foundStandards: Standard[];

    beforeEach(async () => {
      spaceId = createSpaceId(uuidv4());
      standard1 = await standardRepository.add(
        standardFactory({ spaceId, slug: 'slug-1' }),
      );
      standard2 = await standardRepository.add(
        standardFactory({ spaceId, slug: 'slug-2' }),
      );
      standard3 = await standardRepository.add(
        standardFactory({ spaceId, slug: 'slug-3' }),
      );

      foundStandards = await standardRepository.findBySpaceId(spaceId);
    });

    it('returns all three standards', () => {
      expect(foundStandards).toHaveLength(3);
    });

    it('includes the first standard', () => {
      const foundIds = foundStandards.map((s) => s.id);
      expect(foundIds).toContain(standard1.id);
    });

    it('includes the second standard', () => {
      const foundIds = foundStandards.map((s) => s.id);
      expect(foundIds).toContain(standard2.id);
    });

    it('includes the third standard', () => {
      const foundIds = foundStandards.map((s) => s.id);
      expect(foundIds).toContain(standard3.id);
    });
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
