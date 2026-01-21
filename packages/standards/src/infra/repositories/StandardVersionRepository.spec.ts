import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/node-utils';
import {
  itHandlesSoftDelete,
  makeTestDatasource,
  stubLogger,
} from '@packmind/test-utils';
import {
  createStandardId,
  createStandardVersionId,
  Standard,
  StandardVersion,
} from '@packmind/types';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { StandardVersionRepository } from './StandardVersionRepository';

describe('StandardVersionRepository', () => {
  let datasource: DataSource;
  let standardVersionRepository: StandardVersionRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<StandardVersion>;
  let standardRepo: Repository<Standard>;

  beforeEach(async () => {
    datasource = await makeTestDatasource([
      StandardVersionSchema,
      StandardSchema,
      RuleSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(StandardVersionSchema);
    standardRepo = datasource.getRepository(StandardSchema);

    standardVersionRepository = new StandardVersionRepository(
      typeormRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  describe('when storing and retrieving standard versions by standard id', () => {
    let standard: Standard;
    let standardVersion: StandardVersion;
    let foundVersions: StandardVersion[];

    beforeEach(async () => {
      standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );

      standardVersion = standardVersionFactory({ standardId: standard.id });
      await standardVersionRepository.add(standardVersion);

      foundVersions = await standardVersionRepository.findByStandardId(
        standard.id,
      );
    });

    it('returns exactly one version', () => {
      expect(foundVersions).toHaveLength(1);
    });

    it('returns the stored version with correct properties', () => {
      expect(foundVersions[0]).toMatchObject({
        id: standardVersion.id,
        standardId: standardVersion.standardId,
        version: standardVersion.version,
        name: standardVersion.name,
      });
    });
  });

  describe('when storing and retrieving multiple standard versions', () => {
    let standard: Standard;
    let foundVersions: StandardVersion[];

    beforeEach(async () => {
      standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );

      await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 1 }),
      );
      await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 3 }),
      );
      await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 2 }),
      );

      foundVersions = await standardVersionRepository.findByStandardId(
        standard.id,
      );
    });

    it('returns all three versions', () => {
      expect(foundVersions).toHaveLength(3);
    });

    it('orders versions by version number descending', () => {
      expect(foundVersions.map((v) => v.version)).toEqual([3, 2, 1]);
    });
  });

  it('can find a standard version by id', async () => {
    // Create standard first
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );

    const standardVersion = standardVersionFactory({ standardId: standard.id });
    await standardVersionRepository.add(standardVersion);

    const foundVersion = await standardVersionRepository.findById(
      standardVersion.id,
    );
    expect(foundVersion).toEqual(standardVersion);
  });

  it('can find latest standard version by standard id', async () => {
    // Create standard first
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );

    await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard.id, version: 1 }),
    );
    const latestVersion = await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard.id, version: 2 }),
    );

    const foundVersion = await standardVersionRepository.findLatestByStandardId(
      standard.id,
    );
    expect(foundVersion).toMatchObject({
      id: latestVersion.id,
      standardId: latestVersion.standardId,
      version: latestVersion.version,
      name: latestVersion.name,
    });
  });

  it('can find standard version by standard id and version number', async () => {
    // Create standard first
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );

    await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard.id, version: 1 }),
    );
    const version2 = await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard.id, version: 2 }),
    );

    const foundVersion =
      await standardVersionRepository.findByStandardIdAndVersion(
        standard.id,
        2,
      );
    expect(foundVersion).toMatchObject({
      id: version2.id,
      standardId: version2.standardId,
      version: version2.version,
      name: version2.name,
    });
  });

  describe('when multiple versions exist for same standard', () => {
    let standard: Standard;
    let version1: StandardVersion;
    let version2: StandardVersion;
    let version3: StandardVersion;
    let foundVersion1: StandardVersion | null;
    let foundVersion2: StandardVersion | null;
    let foundVersion3: StandardVersion | null;

    beforeEach(async () => {
      standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );

      version1 = await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 1 }),
      );
      version2 = await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 2 }),
      );
      version3 = await standardVersionRepository.add(
        standardVersionFactory({ standardId: standard.id, version: 3 }),
      );

      foundVersion1 =
        await standardVersionRepository.findByStandardIdAndVersion(
          standard.id,
          1,
        );
      foundVersion2 =
        await standardVersionRepository.findByStandardIdAndVersion(
          standard.id,
          2,
        );
      foundVersion3 =
        await standardVersionRepository.findByStandardIdAndVersion(
          standard.id,
          3,
        );
    });

    it('returns version 1 with correct id', () => {
      expect(foundVersion1).toMatchObject({
        version: 1,
        id: version1.id,
      });
    });

    it('returns version 2 with correct id', () => {
      expect(foundVersion2).toMatchObject({
        version: 2,
        id: version2.id,
      });
    });

    it('returns version 3 with correct id', () => {
      expect(foundVersion3).toMatchObject({
        version: 3,
        id: version3.id,
      });
    });
  });

  it('can list all standard versions', async () => {
    // Create standards first
    const standard1 = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );
    const standard2 = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );

    await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard1.id }),
    );
    await standardVersionRepository.add(
      standardVersionFactory({ standardId: standard2.id }),
    );

    const allVersions = await standardVersionRepository.list();
    expect(allVersions).toHaveLength(2);
  });

  describe('when finding non-existent standard versions', () => {
    it('returns null for non-existent id', async () => {
      const foundVersion = await standardVersionRepository.findById(
        createStandardVersionId(uuidv4()),
      );
      expect(foundVersion).toBeNull();
    });

    it('returns empty array for non-existent standard', async () => {
      const foundVersions = await standardVersionRepository.findByStandardId(
        createStandardId(uuidv4()),
      );
      expect(foundVersions).toEqual([]);
    });

    it('returns null for non-existent latest version', async () => {
      const foundVersion =
        await standardVersionRepository.findLatestByStandardId(
          createStandardId(uuidv4()),
        );
      expect(foundVersion).toBeNull();
    });

    it('returns null for non-existent standard id and version', async () => {
      const foundVersion =
        await standardVersionRepository.findByStandardIdAndVersion(
          createStandardId(uuidv4()),
          1,
        );
      expect(foundVersion).toBeNull();
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testStandard: Standard;

    beforeEach(async () => {
      // Create standard for soft delete tests
      testStandard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
    });

    itHandlesSoftDelete<StandardVersion>({
      entityFactory: () =>
        standardVersionFactory({ standardId: testStandard.id }),
      getRepository: () => standardVersionRepository,
      queryDeletedEntity: async (id) =>
        typeormRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<StandardVersion>,
    });
  });
});
