import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/node-utils';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { createRuleId, Rule, Standard, StandardVersion } from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ruleFactory } from '../../../test/ruleFactory';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { RuleRepository } from './RuleRepository';

describe('RuleRepository', () => {
  const fixture = createTestDatasourceFixture([
    RuleSchema,
    StandardVersionSchema,
    StandardSchema,
    GitCommitSchema,
  ]);

  let ruleRepository: RuleRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Rule>;
  let standardRepo: Repository<Standard>;
  let standardVersionRepo: Repository<StandardVersion>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(RuleSchema);
    standardRepo = fixture.datasource.getRepository(StandardSchema);
    standardVersionRepo = fixture.datasource.getRepository(
      StandardVersionSchema,
    );
    ruleRepository = new RuleRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when storing and retrieving rules by standard version', () => {
    let rule: Rule;
    let foundRules: Rule[];

    beforeEach(async () => {
      const standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
      const standardVersion = await standardVersionRepo.save(
        standardVersionFactory({ standardId: standard.id }),
      );

      rule = ruleFactory({ standardVersionId: standardVersion.id });
      await ruleRepository.add(rule);

      foundRules = await ruleRepository.findByStandardVersionId(
        standardVersion.id,
      );
    });

    it('returns one rule', () => {
      expect(foundRules).toHaveLength(1);
    });

    it('returns the stored rule', () => {
      expect(foundRules[0]).toEqual(rule);
    });
  });

  it('can store and retrieve multiple rules by standard version', async () => {
    // Create standard and version first
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );
    const standardVersion = await standardVersionRepo.save(
      standardVersionFactory({ standardId: standard.id }),
    );

    await ruleRepository.add(
      ruleFactory({ standardVersionId: standardVersion.id }),
    );
    await ruleRepository.add(
      ruleFactory({ standardVersionId: standardVersion.id }),
    );
    await ruleRepository.add(
      ruleFactory({ standardVersionId: standardVersion.id }),
    );

    expect(
      await ruleRepository.findByStandardVersionId(standardVersion.id),
    ).toHaveLength(3);
  });

  it('can find a rule by id', async () => {
    // Create standard and version first
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );
    const standardVersion = await standardVersionRepo.save(
      standardVersionFactory({ standardId: standard.id }),
    );

    const rule = ruleFactory({ standardVersionId: standardVersion.id });
    await ruleRepository.add(rule);

    const foundRule = await ruleRepository.findById(rule.id);
    expect(foundRule).toEqual(rule);
  });

  describe('when finding a non-existent rule', () => {
    it('returns null for non-existent id', async () => {
      const foundRule = await ruleRepository.findById(createRuleId(uuidv4()));
      expect(foundRule).toBeNull();
    });

    it('returns empty array for non-existent standard version', async () => {
      // Create a standard version that doesn't have any rules
      const standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
      const standardVersion = await standardVersionRepo.save(
        standardVersionFactory({ standardId: standard.id }),
      );

      const foundRules = await ruleRepository.findByStandardVersionId(
        standardVersion.id,
      );
      expect(foundRules).toEqual([]);
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testStandardVersion: StandardVersion;

    beforeEach(async () => {
      // Create standard and version for soft delete tests
      const standard = await standardRepo.save(
        standardFactory({ slug: `standard-${uuidv4()}` }),
      );
      testStandardVersion = await standardVersionRepo.save(
        standardVersionFactory({ standardId: standard.id }),
      );
    });

    itHandlesSoftDelete<Rule>({
      entityFactory: () =>
        ruleFactory({ standardVersionId: testStandardVersion.id }),
      getRepository: () => ruleRepository,
      queryDeletedEntity: async (id) =>
        typeormRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<Rule>,
    });
  });
});
