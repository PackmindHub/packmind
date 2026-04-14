import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { createTestDatasourceFixture, stubLogger } from '@packmind/test-utils';
import {
  createRuleExampleId,
  createSpaceId,
  Rule,
  RuleExample,
  Standard,
  StandardVersion,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ruleExampleFactory } from '../../../test/ruleExampleFactory';
import { ruleFactory } from '../../../test/ruleFactory';
import { standardFactory } from '../../../test/standardFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { RuleExampleSchema } from '../schemas/RuleExampleSchema';
import { RuleSchema } from '../schemas/RuleSchema';
import { StandardSchema } from '../schemas/StandardSchema';
import { StandardVersionSchema } from '../schemas/StandardVersionSchema';
import { RuleExampleRepository } from './RuleExampleRepository';

describe('RuleExampleRepository', () => {
  const fixture = createTestDatasourceFixture([
    RuleExampleSchema,
    RuleSchema,
    StandardVersionSchema,
    StandardSchema,
    GitCommitSchema,
  ]);

  let ruleExampleRepository: RuleExampleRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let standardRepo: Repository<Standard>;
  let standardVersionRepo: Repository<StandardVersion>;
  let ruleRepo: Repository<Rule>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    standardRepo = fixture.datasource.getRepository(StandardSchema);
    standardVersionRepo = fixture.datasource.getRepository(
      StandardVersionSchema,
    );
    ruleRepo = fixture.datasource.getRepository(RuleSchema);
    ruleExampleRepository = new RuleExampleRepository(
      fixture.datasource.getRepository<RuleExample>(RuleExampleSchema),
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('findByIdInSpace', () => {
    describe('when rule example belongs to the space', () => {
      it('returns the example', async () => {
        const spaceId = createSpaceId(uuidv4());
        const standard = await standardRepo.save(
          standardFactory({ slug: `standard-${uuidv4()}`, spaceId }),
        );
        const standardVersion = await standardVersionRepo.save(
          standardVersionFactory({ standardId: standard.id }),
        );
        const rule = ruleFactory({ standardVersionId: standardVersion.id });
        await ruleRepo.save(rule);
        const example = ruleExampleFactory({ ruleId: rule.id });
        await ruleExampleRepository.add(example);

        const result = await ruleExampleRepository.findByIdInSpace(
          example.id,
          spaceId,
        );

        expect(result).toEqual(example);
      });
    });

    describe('when rule example belongs to a different space', () => {
      it('returns null', async () => {
        const spaceId = createSpaceId(uuidv4());
        const otherSpaceId = createSpaceId(uuidv4());
        const standard = await standardRepo.save(
          standardFactory({ slug: `standard-${uuidv4()}`, spaceId }),
        );
        const standardVersion = await standardVersionRepo.save(
          standardVersionFactory({ standardId: standard.id }),
        );
        const rule = ruleFactory({ standardVersionId: standardVersion.id });
        await ruleRepo.save(rule);
        const example = ruleExampleFactory({ ruleId: rule.id });
        await ruleExampleRepository.add(example);

        const result = await ruleExampleRepository.findByIdInSpace(
          example.id,
          otherSpaceId,
        );

        expect(result).toBeNull();
      });
    });

    describe('when rule example does not exist', () => {
      it('returns null', async () => {
        const result = await ruleExampleRepository.findByIdInSpace(
          createRuleExampleId(uuidv4()),
          createSpaceId(uuidv4()),
        );

        expect(result).toBeNull();
      });
    });
  });
});
