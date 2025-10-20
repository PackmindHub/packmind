import { StandardRepository } from './StandardRepository';
import { StandardSchema } from '../schemas/StandardSchema';
import { DataSource, Repository } from 'typeorm';
import { itHandlesSoftDelete, makeTestDatasource } from '@packmind/shared/test';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { createStandardId, Standard } from '../../domain/entities/Standard';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { RuleSchema } from '../schemas/RuleSchema';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, WithSoftDelete } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { GitCommitSchema } from '@packmind/git';

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
      organizationId,
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

    expect(foundStandards).toHaveLength(1);
    expect(foundStandards[0]).toMatchObject({
      id: standard.id,
      name: standard.name,
      slug: standard.slug,
      description: standard.description,
      organizationId: standard.organizationId,
      userId: standard.userId,
      scope: 'version-2-scope', // Should get scope from latest version
    });
  });

  describe('when no versions exist', () => {
    it('returns standard scope', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const standard = standardFactory({
        organizationId,
        scope: 'standard-scope',
      });
      await standardRepository.add(standard);

      const foundStandards =
        await standardRepository.findByOrganizationId(organizationId);

      expect(foundStandards).toHaveLength(1);
      expect(foundStandards[0].scope).toBe('standard-scope');
    });
  });

  it('can store and retrieve multiple standards by organization', async () => {
    const organizationId = createOrganizationId(uuidv4());
    const standard1 = await standardRepository.add(
      standardFactory({ organizationId, slug: 'slug-1' }),
    );
    const standard2 = await standardRepository.add(
      standardFactory({ organizationId, slug: 'slug-2' }),
    );
    const standard3 = await standardRepository.add(
      standardFactory({ organizationId, slug: 'slug-3' }),
    );

    const foundStandards =
      await standardRepository.findByOrganizationId(organizationId);

    expect(foundStandards).toHaveLength(3);
    const foundIds = foundStandards.map((s) => s.id);
    expect(foundIds).toContain(standard1.id);
    expect(foundIds).toContain(standard2.id);
    expect(foundIds).toContain(standard3.id);
  });

  it('can find a standard by id', async () => {
    const standard = standardFactory();
    await standardRepository.add(standard);

    const foundStandard = await standardRepository.findById(standard.id);
    expect(foundStandard).toEqual(standard);
  });

  it('can find a standard by slug and organization', async () => {
    const standard = standardFactory({ slug: 'unique-slug' });
    await standardRepository.add(standard);

    const foundStandard = await standardRepository.findBySlug(
      'unique-slug',
      standard.organizationId,
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
    const standard = standardFactory({ organizationId, userId });
    await standardRepository.add(standard);

    const foundStandards = await standardRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );
    expect(foundStandards).toEqual([standard]);
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
