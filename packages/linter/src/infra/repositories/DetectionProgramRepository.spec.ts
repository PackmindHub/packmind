import { DetectionProgramRepository } from './DetectionProgramRepository';
import { DetectionProgramSchema } from '../schemas/DetectionProgramSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import {
  createDetectionProgramId,
  DetectionProgram,
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
import { detectionProgramFactory } from '../../../test';

describe('DetectionProgramRepository', () => {
  let datasource: DataSource;
  let detectionProgramRepository: DetectionProgramRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<DetectionProgram>;
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
      DetectionProgramSchema,
      RuleSchema,
      StandardSchema,
      StandardVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(DetectionProgramSchema);
    ruleRepo = datasource.getRepository(RuleSchema);
    standardRepo = datasource.getRepository(StandardSchema);
    standardVersionRepo = datasource.getRepository(StandardVersionSchema);

    detectionProgramRepository = new DetectionProgramRepository(
      typeormRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  it('can store and retrieve detection programs', async () => {
    const rule = await createRuleWithHierarchy();

    const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
    await detectionProgramRepository.add(detectionProgram);

    const foundProgram = await detectionProgramRepository.findById(
      detectionProgram.id,
    );
    expect(foundProgram).toMatchObject({
      id: detectionProgram.id,
      code: detectionProgram.code,
      version: detectionProgram.version,
      mode: detectionProgram.mode,
      ruleId: detectionProgram.ruleId,
    });
  });

  it('can find detection programs by rule id', async () => {
    const rule = await createRuleWithHierarchy();
    const otherRule = await createRuleWithHierarchy();

    const program1 = detectionProgramFactory({
      ruleId: rule.id,
      version: 1,
    });
    const program2 = detectionProgramFactory({
      ruleId: rule.id,
      version: 2,
    });
    const program3 = detectionProgramFactory({ ruleId: otherRule.id }); // Different rule

    await detectionProgramRepository.add(program1);
    await detectionProgramRepository.add(program2);
    await detectionProgramRepository.add(program3);

    const foundPrograms = await detectionProgramRepository.findByRuleId(
      rule.id,
    );

    expect(foundPrograms).toHaveLength(2);
    expect(foundPrograms.map((p: DetectionProgram) => p.id)).toContain(
      program1.id,
    );
    expect(foundPrograms.map((p: DetectionProgram) => p.id)).toContain(
      program2.id,
    );
    expect(foundPrograms.map((p: DetectionProgram) => p.id)).not.toContain(
      program3.id,
    );
  });

  it('can find detection program by rule id and version', async () => {
    const rule = await createRuleWithHierarchy();

    const program1 = detectionProgramFactory({
      ruleId: rule.id,
      version: 1,
    });
    const program2 = detectionProgramFactory({
      ruleId: rule.id,
      version: 2,
    });

    await detectionProgramRepository.add(program1);
    await detectionProgramRepository.add(program2);

    const foundProgram =
      await detectionProgramRepository.findByRuleIdAndVersion(rule.id, 2);

    expect(foundProgram).toMatchObject({
      id: program2.id,
      version: 2,
      ruleId: rule.id,
    });
  });

  it('can get latest version by rule id', async () => {
    const rule = await createRuleWithHierarchy();

    await detectionProgramRepository.add(
      detectionProgramFactory({ ruleId: rule.id, version: 1 }),
    );
    await detectionProgramRepository.add(
      detectionProgramFactory({ ruleId: rule.id, version: 3 }),
    );
    await detectionProgramRepository.add(
      detectionProgramFactory({ ruleId: rule.id, version: 2 }),
    );

    const latestVersion =
      await detectionProgramRepository.getLatestVersionByRuleIdAndLanguage(
        rule.id,
        ProgrammingLanguage.JAVASCRIPT,
      );

    expect(latestVersion).toBe(3);
  });

  describe('when multiple versions exist for same rule', () => {
    it('returns programs ordered by version', async () => {
      const rule = await createRuleWithHierarchy();

      await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );
      await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 3 }),
      );
      await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 2 }),
      );

      const foundPrograms = await detectionProgramRepository.findByRuleId(
        rule.id,
      );

      expect(foundPrograms).toHaveLength(3);
      expect(foundPrograms.map((p: DetectionProgram) => p.version)).toEqual([
        3, 2, 1,
      ]);
    });

    it('returns correct program for specific version', async () => {
      const rule = await createRuleWithHierarchy();

      const program1 = await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 1 }),
      );
      const program2 = await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 2 }),
      );
      const program3 = await detectionProgramRepository.add(
        detectionProgramFactory({ ruleId: rule.id, version: 3 }),
      );

      const foundProgram1 =
        await detectionProgramRepository.findByRuleIdAndVersion(rule.id, 1);
      const foundProgram2 =
        await detectionProgramRepository.findByRuleIdAndVersion(rule.id, 2);
      const foundProgram3 =
        await detectionProgramRepository.findByRuleIdAndVersion(rule.id, 3);

      expect(foundProgram1?.version).toBe(1);
      expect(foundProgram1?.id).toBe(program1.id);

      expect(foundProgram2?.version).toBe(2);
      expect(foundProgram2?.id).toBe(program2.id);

      expect(foundProgram3?.version).toBe(3);
      expect(foundProgram3?.id).toBe(program3.id);
    });
  });

  it('can list all detection programs', async () => {
    const rule1 = await createRuleWithHierarchy();
    const rule2 = await createRuleWithHierarchy();

    await detectionProgramRepository.add(
      detectionProgramFactory({ ruleId: rule1.id }),
    );
    await detectionProgramRepository.add(
      detectionProgramFactory({ ruleId: rule2.id }),
    );

    const allPrograms = await detectionProgramRepository.list();
    expect(allPrograms).toHaveLength(2);
  });

  describe('when finding non-existent detection programs', () => {
    it('returns null for non-existent id', async () => {
      const foundProgram = await detectionProgramRepository.findById(
        createDetectionProgramId(uuidv4()),
      );
      expect(foundProgram).toBeNull();
    });

    it('returns empty array for non-existent rule', async () => {
      const foundPrograms = await detectionProgramRepository.findByRuleId(
        createRuleId(uuidv4()),
      );
      expect(foundPrograms).toEqual([]);
    });

    it('returns null for non-existent rule id and version', async () => {
      const foundProgram =
        await detectionProgramRepository.findByRuleIdAndVersion(
          createRuleId(uuidv4()),
          1,
        );
      expect(foundProgram).toBeNull();
    });

    it('returns 0 for non-existent rule latest version', async () => {
      const latestVersion =
        await detectionProgramRepository.getLatestVersionByRuleIdAndLanguage(
          createRuleId(uuidv4()),
          ProgrammingLanguage.JAVASCRIPT,
        );
      expect(latestVersion).toBe(0);
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testRule: Rule;

    beforeEach(async () => {
      // Create rule for soft delete tests
      testRule = await createRuleWithHierarchy();
    });

    itHandlesSoftDelete<DetectionProgram>({
      entityFactory: () => detectionProgramFactory({ ruleId: testRule.id }),
      getRepository: () => detectionProgramRepository,
      queryDeletedEntity: async (id) =>
        typeormRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<DetectionProgram>,
    });
  });
});
