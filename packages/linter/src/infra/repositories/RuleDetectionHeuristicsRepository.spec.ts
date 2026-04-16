import { RuleDetectionHeuristicsRepository } from './RuleDetectionHeuristicsRepository';
import { DetectionHeuristicsSchema } from '../schemas/DetectionHeuristicsSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import {
  createDetectionHeuristicsId,
  DetectionHeuristics,
  createRuleId,
  ProgrammingLanguage,
  Standard,
  StandardVersion,
  Rule,
} from '@packmind/types';
import { WithSoftDelete } from '@packmind/node-utils';
import { RuleSchema } from '@packmind/standards/src/infra/schemas/RuleSchema';
import { StandardSchema } from '@packmind/standards/src/infra/schemas/StandardSchema';
import { StandardVersionSchema } from '@packmind/standards/src/infra/schemas/StandardVersionSchema';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { ruleFactory } from '@packmind/standards/test/ruleFactory';
import { standardFactory } from '@packmind/standards/test/standardFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { GitCommitSchema } from '@packmind/git';
import { detectionHeuristicsFactory } from '../../../test';

describe('RuleDetectionHeuristicsRepository', () => {
  let datasource: DataSource;
  let ruleDetectionHeuristicsRepository: RuleDetectionHeuristicsRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<DetectionHeuristics>;
  let ruleRepo: Repository<Rule>;
  let standardRepo: Repository<Standard>;
  let standardVersionRepo: Repository<StandardVersion>;

  const createRuleWithHierarchy = async (): Promise<Rule> => {
    const standard = await standardRepo.save(
      standardFactory({ slug: `standard-${uuidv4()}` }),
    );
    const standardVersion = await standardVersionRepo.save(
      standardVersionFactory({ standardId: standard.id }),
    );
    return await ruleRepo.save(
      ruleFactory({ standardVersionId: standardVersion.id }),
    );
  };

  beforeEach(async () => {
    datasource = await makeTestDatasource([
      DetectionHeuristicsSchema,
      RuleSchema,
      StandardSchema,
      StandardVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(DetectionHeuristicsSchema);
    ruleRepo = datasource.getRepository(RuleSchema);
    standardRepo = datasource.getRepository(StandardSchema);
    standardVersionRepo = datasource.getRepository(StandardVersionSchema);

    ruleDetectionHeuristicsRepository = new RuleDetectionHeuristicsRepository(
      typeormRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  it('can store and retrieve detection heuristics', async () => {
    const rule = await createRuleWithHierarchy();

    const heuristics = detectionHeuristicsFactory({ ruleId: rule.id });
    await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics);

    const foundHeuristics = await ruleDetectionHeuristicsRepository.findById(
      heuristics.id,
    );
    expect(foundHeuristics).toMatchObject({
      id: heuristics.id,
      ruleId: heuristics.ruleId,
      language: heuristics.language,
      heuristics: heuristics.heuristics,
    });
  });

  it('can find heuristics by rule id and language', async () => {
    const rule = await createRuleWithHierarchy();

    const heuristics = detectionHeuristicsFactory({
      ruleId: rule.id,
      language: ProgrammingLanguage.TYPESCRIPT,
      heuristics: ['heuristic1', 'heuristic2'],
    });
    await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics);

    const foundHeuristics =
      await ruleDetectionHeuristicsRepository.getHeuristicsForRule(
        rule.id,
        ProgrammingLanguage.TYPESCRIPT,
      );

    expect(foundHeuristics).toMatchObject({
      id: heuristics.id,
      ruleId: rule.id,
      language: ProgrammingLanguage.TYPESCRIPT,
      heuristics: ['heuristic1', 'heuristic2'],
    });
  });

  describe('when getting all heuristics for a rule across languages', () => {
    let rule: Rule;
    let allHeuristics: DetectionHeuristics[];

    beforeEach(async () => {
      rule = await createRuleWithHierarchy();

      const heuristics1 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['typescript-heuristic'],
      });
      const heuristics2 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.JAVASCRIPT,
        heuristics: ['javascript-heuristic'],
      });
      const heuristics3 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.PYTHON,
        heuristics: ['python-heuristic'],
      });

      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics1);
      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics2);
      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics3);

      allHeuristics =
        await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
          rule.id,
        );
    });

    it('returns all three heuristics', async () => {
      expect(allHeuristics).toHaveLength(3);
    });

    it('includes TypeScript heuristics', async () => {
      expect(allHeuristics.map((h) => h.language)).toContain(
        ProgrammingLanguage.TYPESCRIPT,
      );
    });

    it('includes JavaScript heuristics', async () => {
      expect(allHeuristics.map((h) => h.language)).toContain(
        ProgrammingLanguage.JAVASCRIPT,
      );
    });

    it('includes Python heuristics', async () => {
      expect(allHeuristics.map((h) => h.language)).toContain(
        ProgrammingLanguage.PYTHON,
      );
    });
  });

  it('can update existing heuristics', async () => {
    const rule = await createRuleWithHierarchy();

    const heuristics = detectionHeuristicsFactory({
      ruleId: rule.id,
      heuristics: ['original-heuristic'],
    });
    await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics);

    const updatedHeuristics = ['updated-heuristic-1', 'updated-heuristic-2'];
    await ruleDetectionHeuristicsRepository.updateHeuristics(
      heuristics.id,
      updatedHeuristics,
    );

    const foundHeuristics =
      await ruleDetectionHeuristicsRepository.getHeuristicsById(heuristics.id);

    expect(foundHeuristics?.heuristics).toEqual(updatedHeuristics);
  });

  it('returns null for non-existent heuristics by id', async () => {
    const foundHeuristics =
      await ruleDetectionHeuristicsRepository.getHeuristicsById(
        createDetectionHeuristicsId(uuidv4()),
      );
    expect(foundHeuristics).toBeNull();
  });

  it('returns null for non-existent heuristics by rule and language', async () => {
    const foundHeuristics =
      await ruleDetectionHeuristicsRepository.getHeuristicsForRule(
        createRuleId(uuidv4()),
        ProgrammingLanguage.TYPESCRIPT,
      );
    expect(foundHeuristics).toBeNull();
  });

  describe('when no heuristics exist for rule', () => {
    it('returns empty array', async () => {
      const allHeuristics =
        await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
          createRuleId(uuidv4()),
        );
      expect(allHeuristics).toEqual([]);
    });
  });

  describe('when multiple heuristics exist for same rule', () => {
    let rule: Rule;
    let allHeuristics: DetectionHeuristics[];

    beforeEach(async () => {
      rule = await createRuleWithHierarchy();

      const heuristics1 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['ts-heuristic-1', 'ts-heuristic-2'],
      });
      const heuristics2 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.JAVASCRIPT,
        heuristics: ['js-heuristic-1'],
      });
      const heuristics3 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.PYTHON,
        heuristics: ['py-heuristic-1', 'py-heuristic-2', 'py-heuristic-3'],
      });

      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics1);
      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics2);
      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics3);

      allHeuristics =
        await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
          rule.id,
        );
    });

    it('returns all three heuristics', async () => {
      expect(allHeuristics).toHaveLength(3);
    });

    it('returns correct TypeScript heuristics content', async () => {
      const tsHeuristic = allHeuristics.find(
        (h) => h.language === ProgrammingLanguage.TYPESCRIPT,
      );
      expect(tsHeuristic?.heuristics).toEqual([
        'ts-heuristic-1',
        'ts-heuristic-2',
      ]);
    });

    it('returns correct JavaScript heuristics content', async () => {
      const jsHeuristic = allHeuristics.find(
        (h) => h.language === ProgrammingLanguage.JAVASCRIPT,
      );
      expect(jsHeuristic?.heuristics).toEqual(['js-heuristic-1']);
    });

    it('returns correct Python heuristics content', async () => {
      const pyHeuristic = allHeuristics.find(
        (h) => h.language === ProgrammingLanguage.PYTHON,
      );
      expect(pyHeuristic?.heuristics).toEqual([
        'py-heuristic-1',
        'py-heuristic-2',
        'py-heuristic-3',
      ]);
    });
  });

  describe('when updating non-existent heuristics', () => {
    it('throws error', async () => {
      const nonExistentId = createDetectionHeuristicsId(uuidv4());

      await expect(
        ruleDetectionHeuristicsRepository.updateHeuristics(nonExistentId, [
          'new-heuristic',
        ]),
      ).rejects.toThrow(
        `Detection heuristics with id ${nonExistentId} not found`,
      );
    });
  });

  describe('when inserting duplicate rule + language combination', () => {
    it('throws error', async () => {
      const rule = await createRuleWithHierarchy();

      const heuristics1 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['heuristic-1'],
      });
      const heuristics2 = detectionHeuristicsFactory({
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT, // Same rule + language
        heuristics: ['heuristic-2'],
      });

      await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics1);

      await expect(
        ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics2),
      ).rejects.toThrow();
    });

    describe('when same rule has different languages', () => {
      let allHeuristics: DetectionHeuristics[];

      beforeEach(async () => {
        const rule = await createRuleWithHierarchy();

        const typescriptHeuristics = detectionHeuristicsFactory({
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: ['ts-heuristic'],
        });
        const javascriptHeuristics = detectionHeuristicsFactory({
          ruleId: rule.id,
          language: ProgrammingLanguage.JAVASCRIPT, // Different language
          heuristics: ['js-heuristic'],
        });

        await ruleDetectionHeuristicsRepository.upsertHeuristics(
          typescriptHeuristics,
        );
        await ruleDetectionHeuristicsRepository.upsertHeuristics(
          javascriptHeuristics,
        );

        allHeuristics =
          await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
            rule.id,
          );
      });

      it('allows both heuristics to be stored', async () => {
        expect(allHeuristics).toHaveLength(2);
      });

      it('includes TypeScript heuristics', async () => {
        expect(allHeuristics.map((h) => h.language)).toContain(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('includes JavaScript heuristics', async () => {
        expect(allHeuristics.map((h) => h.language)).toContain(
          ProgrammingLanguage.JAVASCRIPT,
        );
      });
    });

    describe('when different rules have same language', () => {
      let rule1Heuristics: DetectionHeuristics[];
      let rule2Heuristics: DetectionHeuristics[];

      beforeEach(async () => {
        const rule1 = await createRuleWithHierarchy();
        const rule2 = await createRuleWithHierarchy();

        const heuristics1 = detectionHeuristicsFactory({
          ruleId: rule1.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: ['heuristic-rule-1'],
        });
        const heuristics2 = detectionHeuristicsFactory({
          ruleId: rule2.id,
          language: ProgrammingLanguage.TYPESCRIPT, // Same language, different rule
          heuristics: ['heuristic-rule-2'],
        });

        await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics1);
        await ruleDetectionHeuristicsRepository.upsertHeuristics(heuristics2);

        rule1Heuristics =
          await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
            rule1.id,
          );
        rule2Heuristics =
          await ruleDetectionHeuristicsRepository.getAllHeuristicsForRule(
            rule2.id,
          );
      });

      it('stores exactly one heuristic for rule1', async () => {
        expect(rule1Heuristics).toHaveLength(1);
      });

      it('stores exactly one heuristic for rule2', async () => {
        expect(rule2Heuristics).toHaveLength(1);
      });

      it('assigns TypeScript language to rule1 heuristic', async () => {
        expect(rule1Heuristics[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('assigns TypeScript language to rule2 heuristic', async () => {
        expect(rule2Heuristics[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testRule: Rule;

    beforeEach(async () => {
      testRule = await createRuleWithHierarchy();
    });

    itHandlesSoftDelete<DetectionHeuristics>({
      entityFactory: () => detectionHeuristicsFactory({ ruleId: testRule.id }),
      getRepository: () => ruleDetectionHeuristicsRepository,
      queryDeletedEntity: async (id) =>
        typeormRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<DetectionHeuristics>,
    });
  });
});
