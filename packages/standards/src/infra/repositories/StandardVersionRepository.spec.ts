import { GitCommitSchema } from '@packmind/git/schemas';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/node-utils';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import {
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  Standard,
  StandardVersion,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { StandardVersionRepository } from './StandardVersionRepository';

describe('StandardVersionRepository', () => {
  const fixture = createTestDatasourceFixture([
    StandardVersionSchema,
    StandardSchema,
    RuleSchema,
    GitCommitSchema,
  ]);

  let standardVersionRepository: StandardVersionRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<StandardVersion>;
  let standardRepo: Repository<Standard>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(StandardVersionSchema);
    standardRepo = fixture.datasource.getRepository(StandardSchema);
    standardVersionRepository = new StandardVersionRepository(
      typeormRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

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
        [standard.spaceId],
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
          [standard.spaceId],
        );
      foundVersion2 =
        await standardVersionRepository.findByStandardIdAndVersion(
          standard.id,
          2,
          [standard.spaceId],
        );
      foundVersion3 =
        await standardVersionRepository.findByStandardIdAndVersion(
          standard.id,
          3,
          [standard.spaceId],
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

  describe('findLatestByStandardIds', () => {
    let firstStandard: Standard;
    let secondStandard: Standard;
    let standardWithoutVersion: Standard;
    let latestOfFirst: StandardVersion;
    let latestOfSecond: StandardVersion;

    beforeEach(async () => {
      firstStandard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
      secondStandard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
      standardWithoutVersion = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );

      await standardVersionRepository.add(
        standardVersionFactory({ standardId: firstStandard.id, version: 1 }),
      );
      latestOfFirst = standardVersionFactory({
        standardId: firstStandard.id,
        version: 2,
      });
      await standardVersionRepository.add(latestOfFirst);

      latestOfSecond = standardVersionFactory({
        standardId: secondStandard.id,
        version: 1,
      });
      await standardVersionRepository.add(latestOfSecond);
    });

    it('returns the highest version of every requested standard', async () => {
      const versions = await standardVersionRepository.findLatestByStandardIds([
        firstStandard.id,
        secondStandard.id,
      ]);

      expect(versions.map((version) => version.id).sort()).toEqual(
        [latestOfFirst.id, latestOfSecond.id].sort(),
      );
    });

    it('omits standards that have no version', async () => {
      const versions = await standardVersionRepository.findLatestByStandardIds([
        firstStandard.id,
        standardWithoutVersion.id,
      ]);

      expect(versions).toHaveLength(1);
    });

    it('issues a single query for several standard ids', async () => {
      const spy = jest.spyOn(fixture.datasource, 'createQueryRunner');
      spy.mockClear();

      await standardVersionRepository.findLatestByStandardIds([
        firstStandard.id,
        secondStandard.id,
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    describe('when the same standard id is repeated', () => {
      it('issues a single query', async () => {
        const spy = jest.spyOn(fixture.datasource, 'createQueryRunner');
        spy.mockClear();

        await standardVersionRepository.findLatestByStandardIds([
          firstStandard.id,
          firstStandard.id,
          secondStandard.id,
        ]);

        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('returns the repeated standard once', async () => {
        const versions =
          await standardVersionRepository.findLatestByStandardIds([
            firstStandard.id,
            firstStandard.id,
          ]);

        expect(versions).toHaveLength(1);
      });
    });

    describe('when no id is given', () => {
      it('returns nothing without querying', async () => {
        const spy = jest.spyOn(fixture.datasource, 'createQueryRunner');
        spy.mockClear();

        await standardVersionRepository.findLatestByStandardIds([]);

        expect(spy).not.toHaveBeenCalled();
      });
    });

    describe('when the latest version was soft deleted', () => {
      beforeEach(async () => {
        await typeormRepo.softDelete(latestOfFirst.id);
      });

      it('falls back to the newest remaining version', async () => {
        const versions =
          await standardVersionRepository.findLatestByStandardIds([
            firstStandard.id,
          ]);

        expect(versions[0].version).toBe(1);
      });
    });
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

    describe('when allowedSpaceIds is empty even if matching data exists', () => {
      it('returns null', async () => {
        const standard = await standardRepo.save(
          standardFactory({ slug: `standard-${uuidv4()}` }),
        );

        await standardVersionRepository.add(
          standardVersionFactory({ standardId: standard.id, version: 1 }),
        );

        const foundVersion =
          await standardVersionRepository.findByStandardIdAndVersion(
            standard.id,
            1,
            [],
          );

        expect(foundVersion).toBeNull();
      });
    });

    it('returns null for non-existent standard id and version', async () => {
      const foundVersion =
        await standardVersionRepository.findByStandardIdAndVersion(
          createStandardId(uuidv4()),
          1,
          [createSpaceId(uuidv4())],
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
