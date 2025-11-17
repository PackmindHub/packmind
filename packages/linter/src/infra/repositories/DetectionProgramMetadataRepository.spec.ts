import { DetectionProgramMetadataRepository } from './DetectionProgramMetadataRepository';
import { DetectionProgramMetadataSchema } from '../schemas/DetectionProgramMetadataSchema';
import { ExecutionLogSchema } from '../schemas/ExecutionLogSchema';
import { DetectionProgramSchema } from '../schemas/DetectionProgramSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource, stubLogger } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import {
  DetectionProgramMetadata,
  ExecutionLog,
  DetectionProgram,
  createDetectionProgramId,
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
import {
  detectionProgramFactory,
  detectionProgramMetadataFactory,
  executionLogFactory,
} from '../../../test';

describe('DetectionProgramMetadataRepository', () => {
  let datasource: DataSource;
  let metadataRepository: DetectionProgramMetadataRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormMetadataRepo: Repository<DetectionProgramMetadata>;
  let typeormExecutionLogRepo: Repository<
    ExecutionLog & { id: string; detectionProgramMetadataId: string }
  >;
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
      DetectionProgramMetadataSchema,
      ExecutionLogSchema,
      DetectionProgramSchema,
      RuleSchema,
      StandardSchema,
      StandardVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormMetadataRepo = datasource.getRepository(
      DetectionProgramMetadataSchema,
    );
    typeormExecutionLogRepo = datasource.getRepository(ExecutionLogSchema);
    detectionProgramRepo = datasource.getRepository(DetectionProgramSchema);
    ruleRepo = datasource.getRepository(RuleSchema);
    standardRepo = datasource.getRepository(StandardSchema);
    standardVersionRepo = datasource.getRepository(StandardVersionSchema);

    metadataRepository = new DetectionProgramMetadataRepository(
      typeormMetadataRepo,
      typeormExecutionLogRepo,
      stubbedLogger,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  it('can store and retrieve detection program metadata', async () => {
    const rule = await createRuleWithHierarchy();
    const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
    await detectionProgramRepo.save(detectionProgram);

    const metadata = detectionProgramMetadataFactory({
      detectionProgramId: detectionProgram.id,
    });
    await metadataRepository.add(metadata);

    const foundMetadata = await metadataRepository.findById(metadata.id);
    expect(foundMetadata).toMatchObject({
      id: metadata.id,
      detectionProgramId: metadata.detectionProgramId,
      taskId: metadata.taskId,
      programDescription: metadata.programDescription,
    });
  });

  it('can find metadata by detection program id', async () => {
    const rule = await createRuleWithHierarchy();
    const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
    await detectionProgramRepo.save(detectionProgram);

    const metadata = detectionProgramMetadataFactory({
      detectionProgramId: detectionProgram.id,
    });
    await metadataRepository.add(metadata);

    const foundMetadata = await metadataRepository.findByDetectionProgramId(
      detectionProgram.id,
    );
    expect(foundMetadata).toMatchObject({
      id: metadata.id,
      detectionProgramId: detectionProgram.id,
    });
  });

  it('returns null when metadata not found by detection program id', async () => {
    const nonExistentId = createDetectionProgramId(uuidv4());

    const foundMetadata =
      await metadataRepository.findByDetectionProgramId(nonExistentId);
    expect(foundMetadata).toBeNull();
  });

  describe('addLog', () => {
    it('adds execution log to existing metadata', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      const metadata = detectionProgramMetadataFactory({
        detectionProgramId: detectionProgram.id,
      });
      await metadataRepository.add(metadata);

      const log = executionLogFactory({ message: 'Test log entry' });
      await metadataRepository.addLog(log, detectionProgram.id);

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata?.logs).toHaveLength(1);
      expect(foundMetadata?.logs?.[0]).toMatchObject({
        message: 'Test log entry',
      });
    });

    it('creates metadata automatically when not found', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      const log = executionLogFactory({ message: 'Auto-created log' });
      await metadataRepository.addLog(log, detectionProgram.id);

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata).not.toBeNull();
      expect(foundMetadata?.detectionProgramId).toBe(detectionProgram.id);
      expect(foundMetadata?.logs).toHaveLength(1);
      expect(foundMetadata?.logs?.[0]).toMatchObject({
        message: 'Auto-created log',
      });
    });
  });

  describe('updateProgramDescription', () => {
    it('updates program description for existing metadata', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      const metadata = detectionProgramMetadataFactory({
        detectionProgramId: detectionProgram.id,
        programDescription: 'Original description',
      });
      await metadataRepository.add(metadata);

      await metadataRepository.updateProgramDescription(
        'Updated description',
        detectionProgram.id,
      );

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata?.programDescription).toBe('Updated description');
    });

    it('creates metadata automatically when not found', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      await metadataRepository.updateProgramDescription(
        'New description',
        detectionProgram.id,
      );

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata).not.toBeNull();
      expect(foundMetadata?.detectionProgramId).toBe(detectionProgram.id);
      expect(foundMetadata?.programDescription).toBe('New description');
    });
  });

  describe('updateTokensUsed', () => {
    it('updates tokens used for existing metadata', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      const metadata = detectionProgramMetadataFactory({
        detectionProgramId: detectionProgram.id,
        tokens: null,
      });
      await metadataRepository.add(metadata);

      const tokens = { input: 100, output: 50 };
      await metadataRepository.updateTokensUsed(tokens, detectionProgram.id);

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata?.tokens).toEqual(tokens);
    });

    it('creates metadata automatically when not found', async () => {
      const rule = await createRuleWithHierarchy();
      const detectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(detectionProgram);

      const tokens = { input: 100, output: 50 };
      await metadataRepository.updateTokensUsed(tokens, detectionProgram.id);

      const foundMetadata = await metadataRepository.findByDetectionProgramId(
        detectionProgram.id,
      );
      expect(foundMetadata).not.toBeNull();
      expect(foundMetadata?.detectionProgramId).toBe(detectionProgram.id);
      expect(foundMetadata?.tokens).toEqual(tokens);
    });
  });

  describe('Soft-delete with valid foreign keys', () => {
    let testDetectionProgram: DetectionProgram;

    beforeEach(async () => {
      const rule = await createRuleWithHierarchy();
      testDetectionProgram = detectionProgramFactory({ ruleId: rule.id });
      await detectionProgramRepo.save(testDetectionProgram);
    });

    itHandlesSoftDelete<DetectionProgramMetadata>({
      entityFactory: () =>
        detectionProgramMetadataFactory({
          detectionProgramId: testDetectionProgram.id,
        }),
      getRepository: () => metadataRepository,
      queryDeletedEntity: async (id) =>
        typeormMetadataRepo.findOne({
          where: { id },
          withDeleted: true,
        }) as unknown as WithSoftDelete<DetectionProgramMetadata>,
    });
  });
});
