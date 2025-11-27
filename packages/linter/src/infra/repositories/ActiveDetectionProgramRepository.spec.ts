import { ActiveDetectionProgramRepository } from './ActiveDetectionProgramRepository';
import { ActiveDetectionProgramSchema } from '../schemas/ActiveDetectionProgramSchema';
import { DetectionProgramSchema } from '../schemas/DetectionProgramSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import {
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  DetectionProgram,
  createRuleId,
  ProgrammingLanguage,
  Rule,
  Standard,
  StandardVersion,
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
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../test';

describe('ActiveDetectionProgramRepository', () => {
  let datasource: DataSource;
  let activeDetectionProgramRepository: ActiveDetectionProgramRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<ActiveDetectionProgram>;
  let detectionProgramRepo: Repository<DetectionProgram>;
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
      ActiveDetectionProgramSchema,
      DetectionProgramSchema,
      RuleSchema,
      StandardSchema,
      StandardVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(ActiveDetectionProgramSchema);
    detectionProgramRepo = datasource.getRepository(DetectionProgramSchema);
    ruleRepo = datasource.getRepository(RuleSchema);
    standardRepo = datasource.getRepository(StandardSchema);
    standardVersionRepo = datasource.getRepository(StandardVersionSchema);

    activeDetectionProgramRepository = new ActiveDetectionProgramRepository(
      typeormRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  it('can store and retrieve active detection programs', async () => {
    const rule = await createRuleWithHierarchy();
    const detectionProgram = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule.id }),
    );

    const activeProgram = activeDetectionProgramFactory({
      ruleId: rule.id,
      detectionProgramVersion: detectionProgram.id,
    });
    await activeDetectionProgramRepository.add(activeProgram);

    const foundProgram = await activeDetectionProgramRepository.findById(
      activeProgram.id,
    );
    expect(foundProgram).toMatchObject({
      id: activeProgram.id,
      detectionProgramVersion: activeProgram.detectionProgramVersion,
      ruleId: activeProgram.ruleId,
      language: activeProgram.language,
    });
  });

  it('can find active detection programs by rule id', async () => {
    // Create rules and detection programs first
    const rule1 = await createRuleWithHierarchy();
    const rule2 = await createRuleWithHierarchy();
    const detectionProgram1 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule1.id, version: 1 }),
    );
    const detectionProgram2 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule1.id, version: 2 }),
    );
    const detectionProgram3 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule2.id, version: 1 }),
    );

    const activeProgram1 = activeDetectionProgramFactory({
      ruleId: rule1.id,
      detectionProgramVersion: detectionProgram1.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });
    const activeProgram2 = activeDetectionProgramFactory({
      ruleId: rule1.id,
      detectionProgramVersion: detectionProgram2.id,
      language: ProgrammingLanguage.TYPESCRIPT,
    });
    const activeProgram3 = activeDetectionProgramFactory({
      ruleId: rule2.id,
      detectionProgramVersion: detectionProgram3.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });

    await activeDetectionProgramRepository.add(activeProgram1);
    await activeDetectionProgramRepository.add(activeProgram2);
    await activeDetectionProgramRepository.add(activeProgram3);

    const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
      rule1.id,
    );

    expect(foundPrograms).toHaveLength(2);
    expect(foundPrograms.map((p: ActiveDetectionProgram) => p.id)).toContain(
      activeProgram1.id,
    );
    expect(foundPrograms.map((p: ActiveDetectionProgram) => p.id)).toContain(
      activeProgram2.id,
    );
    expect(
      foundPrograms.map((p: ActiveDetectionProgram) => p.id),
    ).not.toContain(activeProgram3.id);
  });

  it('can find active detection program by rule id and language', async () => {
    // Create rule and detection programs first
    const rule = await createRuleWithHierarchy();
    const detectionProgram1 = await detectionProgramRepo.save(
      detectionProgramFactory({
        ruleId: rule.id,
        version: 1,
        language: ProgrammingLanguage.JAVASCRIPT,
      }),
    );
    const detectionProgram2 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule.id, version: 2 }),
    );

    const activeProgram1 = activeDetectionProgramFactory({
      ruleId: rule.id,
      detectionProgramVersion: detectionProgram1.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });
    const activeProgram2 = activeDetectionProgramFactory({
      ruleId: rule.id,
      detectionProgramVersion: detectionProgram2.id,
      language: ProgrammingLanguage.TYPESCRIPT,
    });

    await activeDetectionProgramRepository.add(activeProgram1);
    await activeDetectionProgramRepository.add(activeProgram2);

    const foundProgram =
      await activeDetectionProgramRepository.findByRuleIdAndLanguage(
        rule.id,
        ProgrammingLanguage.TYPESCRIPT,
      );

    expect(foundProgram).toMatchObject({
      id: activeProgram2.id,
      language: ProgrammingLanguage.TYPESCRIPT,
      ruleId: rule.id,
    });
  });

  it('can find active detection programs with associated detection programs', async () => {
    // Create rule and detection program first
    const rule = await createRuleWithHierarchy();
    const detectionProgram = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule.id, version: 1 }),
    );
    const draftDetectionProgram = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule.id, version: 2 }),
    );

    const activeProgram = activeDetectionProgramFactory({
      ruleId: rule.id,
      detectionProgramVersion: detectionProgram.id,
      detectionProgramDraftVersion: draftDetectionProgram.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });
    await activeDetectionProgramRepository.add(activeProgram);

    const foundPrograms =
      await activeDetectionProgramRepository.findByRuleIdWithPrograms(rule.id);

    expect(foundPrograms).toHaveLength(1);
    expect(foundPrograms[0]).toMatchObject({
      id: activeProgram.id,
      language: activeProgram.language,
      ruleId: activeProgram.ruleId,
      detectionProgram: {
        id: detectionProgram.id,
        code: detectionProgram.code,
        version: detectionProgram.version,
        mode: detectionProgram.mode,
      },
      draftDetectionProgram: {
        id: draftDetectionProgram.id,
        code: draftDetectionProgram.code,
        version: draftDetectionProgram.version,
        mode: draftDetectionProgram.mode,
      },
    });
  });

  it('can delete active detection programs by rule id', async () => {
    // Create rules and detection programs first
    const rule1 = await createRuleWithHierarchy();
    const rule2 = await createRuleWithHierarchy();
    const detectionProgram1 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule1.id, version: 1 }),
    );
    const detectionProgram2 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule1.id, version: 2 }),
    );
    const detectionProgram3 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule2.id, version: 1 }),
    );

    const activeProgram1 = activeDetectionProgramFactory({
      ruleId: rule1.id,
      detectionProgramVersion: detectionProgram1.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });
    const activeProgram2 = activeDetectionProgramFactory({
      ruleId: rule1.id,
      detectionProgramVersion: detectionProgram2.id,
      language: ProgrammingLanguage.TYPESCRIPT,
    });
    const activeProgram3 = activeDetectionProgramFactory({
      ruleId: rule2.id,
      detectionProgramVersion: detectionProgram3.id,
      language: ProgrammingLanguage.JAVASCRIPT,
    });

    await activeDetectionProgramRepository.add(activeProgram1);
    await activeDetectionProgramRepository.add(activeProgram2);
    await activeDetectionProgramRepository.add(activeProgram3);

    await activeDetectionProgramRepository.deleteByRuleId(rule1.id);

    const remainingPrograms = await activeDetectionProgramRepository.list();
    expect(remainingPrograms).toHaveLength(1);
    expect(remainingPrograms[0].id).toBe(activeProgram3.id);
  });

  it('can list all active detection programs', async () => {
    // Create rules and detection programs first
    const rule1 = await createRuleWithHierarchy();
    const rule2 = await createRuleWithHierarchy();
    const detectionProgram1 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule1.id, version: 1 }),
    );
    const detectionProgram2 = await detectionProgramRepo.save(
      detectionProgramFactory({ ruleId: rule2.id, version: 1 }),
    );

    await activeDetectionProgramRepository.add(
      activeDetectionProgramFactory({
        ruleId: rule1.id,
        detectionProgramVersion: detectionProgram1.id,
      }),
    );
    await activeDetectionProgramRepository.add(
      activeDetectionProgramFactory({
        ruleId: rule2.id,
        detectionProgramVersion: detectionProgram2.id,
      }),
    );

    const allPrograms = await activeDetectionProgramRepository.list();
    expect(allPrograms).toHaveLength(2);
  });

  describe('when finding non-existent active detection programs', () => {
    it('returns null for non-existent id', async () => {
      const foundProgram = await activeDetectionProgramRepository.findById(
        createActiveDetectionProgramId(uuidv4()),
      );
      expect(foundProgram).toBeNull();
    });

    it('returns empty array for non-existent rule', async () => {
      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        createRuleId(uuidv4()),
      );
      expect(foundPrograms).toEqual([]);
    });

    it('returns null for non-existent rule id and language', async () => {
      const foundProgram =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          createRuleId(uuidv4()),
          ProgrammingLanguage.JAVASCRIPT,
        );
      expect(foundProgram).toBeNull();
    });

    it('returns empty array for non-existent rule with programs', async () => {
      const foundPrograms =
        await activeDetectionProgramRepository.findByRuleIdWithPrograms(
          createRuleId(uuidv4()),
        );
      expect(foundPrograms).toEqual([]);
    });
  });

  describe('when enforcing business rule constraints', () => {
    it('prevents duplicate rule id and language combinations', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram1 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );
      const detectionProgram2 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 2 }),
      );

      const activeProgram1 = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const activeProgram2 = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.JAVASCRIPT, // Same language
      });

      await activeDetectionProgramRepository.add(activeProgram1);

      await expect(
        activeDetectionProgramRepository.add(activeProgram2),
      ).rejects.toThrow();
    });

    it('allows same rule with different languages', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram1 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );
      const detectionProgram2 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 2 }),
      );

      const javascriptActiveProgram = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const typescriptActiveProgram = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.TYPESCRIPT, // Different language
      });

      await activeDetectionProgramRepository.add(javascriptActiveProgram);
      await activeDetectionProgramRepository.add(typescriptActiveProgram);

      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        rule.id,
      );
      expect(foundPrograms).toHaveLength(2);
      expect(foundPrograms.map((p) => p.language)).toContain(
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(foundPrograms.map((p) => p.language)).toContain(
        ProgrammingLanguage.TYPESCRIPT,
      );
    });

    it('allows different rules with same language', async () => {
      const rule1 = await createRuleWithHierarchy();
      const rule2 = await createRuleWithHierarchy();
      const detectionProgram1 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule1.id, version: 1 }),
      );
      const detectionProgram2 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule2.id, version: 1 }),
      );

      const activeProgram1 = activeDetectionProgramFactory({
        ruleId: rule1.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const activeProgram2 = activeDetectionProgramFactory({
        ruleId: rule2.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.JAVASCRIPT, // Same language, different rule
      });

      await activeDetectionProgramRepository.add(activeProgram1);
      await activeDetectionProgramRepository.add(activeProgram2);

      const foundPrograms1 =
        await activeDetectionProgramRepository.findByRuleId(rule1.id);
      const foundPrograms2 =
        await activeDetectionProgramRepository.findByRuleId(rule2.id);

      expect(foundPrograms1).toHaveLength(1);
      expect(foundPrograms2).toHaveLength(1);
      expect(foundPrograms1[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
      expect(foundPrograms2[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
    });
  });

  describe('when using soft delete functionality', () => {
    it('excludes soft deleted programs from findByRuleId by default', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );

      const activeProgram = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram.id,
      });
      await activeDetectionProgramRepository.add(activeProgram);
      await activeDetectionProgramRepository.deleteById(activeProgram.id);

      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        rule.id,
      );
      expect(foundPrograms).toEqual([]);
    });

    it('includes soft deleted programs with withDeleted option', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );

      const activeProgram = activeDetectionProgramFactory({
        ruleId: rule.id,
        detectionProgramVersion: detectionProgram.id,
      });
      await activeDetectionProgramRepository.add(activeProgram);
      await activeDetectionProgramRepository.deleteById(activeProgram.id);

      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        rule.id,
        { includeDeleted: true },
      );
      expect(foundPrograms).toHaveLength(1);
      expect(foundPrograms[0].id).toBe(activeProgram.id);
    });
  });

  describe('multi-language query scenarios', () => {
    let testRule: Rule;
    let detectionProgram1: DetectionProgram;
    let detectionProgram2: DetectionProgram;
    let detectionProgram3: DetectionProgram;

    beforeEach(async () => {
      testRule = await createRuleWithHierarchy();
      detectionProgram1 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: testRule.id, version: 1 }),
      );
      detectionProgram2 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: testRule.id, version: 2 }),
      );
      detectionProgram3 = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: testRule.id, version: 3 }),
      );
    });

    it('can find active programs for multiple languages', async () => {
      const javascriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const typescriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });
      const pythonProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram3.id,
        language: ProgrammingLanguage.PYTHON,
      });

      await activeDetectionProgramRepository.add(javascriptProgram);
      await activeDetectionProgramRepository.add(typescriptProgram);
      await activeDetectionProgramRepository.add(pythonProgram);

      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        testRule.id,
      );

      expect(foundPrograms).toHaveLength(3);
      const languages = foundPrograms.map((p) => p.language);
      expect(languages).toContain(ProgrammingLanguage.JAVASCRIPT);
      expect(languages).toContain(ProgrammingLanguage.TYPESCRIPT);
      expect(languages).toContain(ProgrammingLanguage.PYTHON);
    });

    it('can find specific language program', async () => {
      const javascriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const typescriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      await activeDetectionProgramRepository.add(javascriptProgram);
      await activeDetectionProgramRepository.add(typescriptProgram);

      const foundJavaScript =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          testRule.id,
          ProgrammingLanguage.JAVASCRIPT,
        );
      const foundTypeScript =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          testRule.id,
          ProgrammingLanguage.TYPESCRIPT,
        );
      const foundPython =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          testRule.id,
          ProgrammingLanguage.PYTHON,
        );

      expect(foundJavaScript).toMatchObject({
        id: javascriptProgram.id,
        language: ProgrammingLanguage.JAVASCRIPT,
        detectionProgramVersion: detectionProgram1.id,
      });
      expect(foundTypeScript).toMatchObject({
        id: typescriptProgram.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        detectionProgramVersion: detectionProgram2.id,
      });
      expect(foundPython).toBeNull();
    });

    it('can find programs with detection program data for multiple languages', async () => {
      const javascriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const typescriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      await activeDetectionProgramRepository.add(javascriptProgram);
      await activeDetectionProgramRepository.add(typescriptProgram);

      const foundPrograms =
        await activeDetectionProgramRepository.findByRuleIdWithPrograms(
          testRule.id,
        );

      expect(foundPrograms).toHaveLength(2);

      const jsProgram = foundPrograms.find(
        (p) => p.language === ProgrammingLanguage.JAVASCRIPT,
      );
      const tsProgram = foundPrograms.find(
        (p) => p.language === ProgrammingLanguage.TYPESCRIPT,
      );

      expect(jsProgram).toMatchObject({
        id: javascriptProgram.id,
        language: ProgrammingLanguage.JAVASCRIPT,
        detectionProgram: {
          id: detectionProgram1.id,
          version: detectionProgram1.version,
        },
      });
      expect(tsProgram).toMatchObject({
        id: typescriptProgram.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        detectionProgram: {
          id: detectionProgram2.id,
          version: detectionProgram2.version,
        },
      });
    });

    it('handles language-specific soft delete correctly', async () => {
      const javascriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const typescriptProgram = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      await activeDetectionProgramRepository.add(javascriptProgram);
      await activeDetectionProgramRepository.add(typescriptProgram);

      // Soft delete only the JavaScript program
      await activeDetectionProgramRepository.deleteById(javascriptProgram.id);

      const foundPrograms = await activeDetectionProgramRepository.findByRuleId(
        testRule.id,
      );
      const foundJavaScript =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          testRule.id,
          ProgrammingLanguage.JAVASCRIPT,
        );
      const foundTypeScript =
        await activeDetectionProgramRepository.findByRuleIdAndLanguage(
          testRule.id,
          ProgrammingLanguage.TYPESCRIPT,
        );

      expect(foundPrograms).toHaveLength(1);
      expect(foundPrograms[0].language).toBe(ProgrammingLanguage.TYPESCRIPT);
      expect(foundJavaScript).toBeNull();
      expect(foundTypeScript).toMatchObject({
        id: typescriptProgram.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });
    });

    it('validates language constraint in unique index', async () => {
      const program1 = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram1.id,
        language: ProgrammingLanguage.JAVASCRIPT,
      });
      const program2 = activeDetectionProgramFactory({
        ruleId: testRule.id,
        detectionProgramVersion: detectionProgram2.id,
        language: ProgrammingLanguage.JAVASCRIPT, // Same rule + language combination
      });

      await activeDetectionProgramRepository.add(program1);

      // Should fail due to unique constraint on (rule_id, language)
      await expect(
        activeDetectionProgramRepository.add(program2),
      ).rejects.toThrow();
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testRule: Rule;
    let testDetectionProgram: DetectionProgram;

    beforeEach(async () => {
      // Create rule and detection program for soft delete tests
      testRule = await createRuleWithHierarchy();
      testDetectionProgram = await detectionProgramRepo.save(
        detectionProgramFactory({ ruleId: testRule.id, version: 1 }),
      );
    });

    itHandlesSoftDelete<ActiveDetectionProgram>({
      entityFactory: () =>
        activeDetectionProgramFactory({
          ruleId: testRule.id,
          detectionProgramVersion: testDetectionProgram.id,
        }),
      getRepository: () => activeDetectionProgramRepository,
      queryDeletedEntity: async (id) =>
        typeormRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<ActiveDetectionProgram>,
    });
  });
});
