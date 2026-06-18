import { CopyDetectionProgramsToNewRuleUseCase } from './CopyDetectionProgramsToNewRuleUseCase';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { IDetectionProgramMetadataRepository } from '../../../domain/repositories/IDetectionProgramMetadataRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  DetectionProgramMetadata,
} from '@packmind/types';
import {
  ActiveDetectionProgram,
  createRuleId,
  DetectionSeverity,
  ProgrammingLanguage,
  DetectionProgram,
  LanguageDetectionPrograms,
} from '@packmind/types';
import {
  detectionProgramFactory,
  activeDetectionProgramFactory,
  detectionProgramMetadataFactory,
} from '../../../../test';
import { v4 as uuidv4 } from 'uuid';

describe('CopyDetectionProgramsToNewRuleUseCase', () => {
  let useCase: CopyDetectionProgramsToNewRuleUseCase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let detectionProgramMetadataRepository: jest.Mocked<IDetectionProgramMetadataRepository>;
  let repositories: jest.Mocked<ILinterRepositories>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const oldRuleId = createRuleId(uuidv4());
  const newRuleId = createRuleId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  beforeEach(() => {
    detectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleId: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    activeDetectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    detectionProgramMetadataRepository = {
      add: jest.fn().mockImplementation(async (m) => m),
      findByDetectionProgramId: jest.fn(),
      findByDetectionProgramIds: jest.fn().mockResolvedValue([]),
      addLog: jest.fn(),
      updateProgramDescription: jest.fn(),
      updateTokensUsed: jest.fn(),
      softDeleteByDetectionProgramIds: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramMetadataRepository>;

    repositories = {
      getDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(detectionProgramRepository),
      getActiveDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(activeDetectionProgramRepository),
      getDetectionProgramMetadataRepository: jest
        .fn()
        .mockReturnValue(detectionProgramMetadataRepository),
    } as unknown as jest.Mocked<ILinterRepositories>;

    stubbedLogger = stubLogger();

    useCase = new CopyDetectionProgramsToNewRuleUseCase(
      repositories,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when old rule has detection programs', () => {
    describe('when copying all detection programs', () => {
      let result: { copiedProgramsCount: number };
      let detectionProgram1: DetectionProgram;
      let detectionProgram2: DetectionProgram;

      beforeEach(async () => {
        detectionProgram1 = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          version: 1,
        });
        detectionProgram2 = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          version: 1,
        });

        detectionProgramRepository.findByRuleId.mockResolvedValue([
          detectionProgram1,
          detectionProgram2,
        ]);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [],
        );

        detectionProgramRepository.add.mockImplementation(
          async (program: DetectionProgram) => program,
        );

        result = await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });
      });

      it('returns copied programs count of 2', () => {
        expect(result.copiedProgramsCount).toBe(2);
      });

      it('calls add on detection program repository twice', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledTimes(2);
      });

      it('assigns new rule ID to first copied program', () => {
        const firstCall = detectionProgramRepository.add.mock.calls[0][0];
        expect(firstCall.ruleId).toBe(newRuleId);
      });

      it('preserves version of first copied program', () => {
        const firstCall = detectionProgramRepository.add.mock.calls[0][0];
        expect(firstCall.version).toBe(1);
      });

      it('preserves language of first copied program', () => {
        const firstCall = detectionProgramRepository.add.mock.calls[0][0];
        expect(firstCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('generates new ID for first copied program', () => {
        const firstCall = detectionProgramRepository.add.mock.calls[0][0];
        expect(firstCall.id).not.toBe(detectionProgram1.id);
      });

      it('assigns new rule ID to second copied program', () => {
        const secondCall = detectionProgramRepository.add.mock.calls[1][0];
        expect(secondCall.ruleId).toBe(newRuleId);
      });

      it('preserves version of second copied program', () => {
        const secondCall = detectionProgramRepository.add.mock.calls[1][0];
        expect(secondCall.version).toBe(1);
      });

      it('preserves language of second copied program', () => {
        const secondCall = detectionProgramRepository.add.mock.calls[1][0];
        expect(secondCall.language).toBe(ProgrammingLanguage.PYTHON);
      });

      it('generates new ID for second copied program', () => {
        const secondCall = detectionProgramRepository.add.mock.calls[1][0];
        expect(secondCall.id).not.toBe(detectionProgram2.id);
      });
    });

    describe('when copying active detection programs', () => {
      let detectionProgram: DetectionProgram;
      let activeProgram: LanguageDetectionPrograms;

      beforeEach(async () => {
        detectionProgram = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          version: 1,
        });

        activeProgram = activeDetectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionProgramVersion: detectionProgram.id,
          detectionProgramDraftVersion: null,
        }) as LanguageDetectionPrograms;

        detectionProgramRepository.findByRuleId.mockResolvedValue([
          detectionProgram,
        ]);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [activeProgram],
        );

        detectionProgramRepository.add.mockImplementation(
          async (program: DetectionProgram) => program,
        );
        activeDetectionProgramRepository.add.mockImplementation(
          async (active) => active,
        );

        await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });
      });

      it('calls add on active detection program repository once', () => {
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(1);
      });

      it('assigns new rule ID to copied active program', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.ruleId).toBe(newRuleId);
      });

      it('preserves language of copied active program', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('generates new ID for copied active program', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.id).not.toBe(activeProgram.id);
      });

      it('updates detection program version reference to new program', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.detectionProgramVersion).not.toBe(
          detectionProgram.id,
        );
      });

      it('sets a truthy detection program version reference', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.detectionProgramVersion).toBeTruthy();
      });

      it('preserves severity of copied active program', () => {
        const activeCall =
          activeDetectionProgramRepository.add.mock.calls[0][0];
        expect(activeCall.severity).toBe(DetectionSeverity.ERROR);
      });
    });

    describe('when active programs have both active and draft versions', () => {
      let activeCall: ActiveDetectionProgram;

      beforeEach(async () => {
        const detectionProgram1 = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          version: 1,
        });
        const detectionProgram2 = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          version: 2,
        });

        const activeProgram = activeDetectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionProgramVersion: detectionProgram1.id,
          detectionProgramDraftVersion: detectionProgram2.id,
        }) as LanguageDetectionPrograms;

        detectionProgramRepository.findByRuleId.mockResolvedValue([
          detectionProgram1,
          detectionProgram2,
        ]);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [activeProgram],
        );

        detectionProgramRepository.add.mockImplementation(
          async (program: DetectionProgram) => program,
        );
        activeDetectionProgramRepository.add.mockImplementation(
          async (active) => active,
        );

        await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });

        activeCall = activeDetectionProgramRepository.add.mock.calls[0][0];
      });

      it('sets truthy detection program version', () => {
        expect(activeCall.detectionProgramVersion).toBeTruthy();
      });

      it('sets truthy detection program draft version', () => {
        expect(activeCall.detectionProgramDraftVersion).toBeTruthy();
      });

      it('uses different IDs for active and draft versions', () => {
        expect(activeCall.detectionProgramVersion).not.toBe(
          activeCall.detectionProgramDraftVersion,
        );
      });
    });

    describe('when handling multiple languages per rule', () => {
      let result: { copiedProgramsCount: number };

      beforeEach(async () => {
        const tsProgram = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });
        const pyProgram = detectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
        });

        const tsActiveProgram = activeDetectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionProgramVersion: tsProgram.id,
        }) as LanguageDetectionPrograms;

        const pyActiveProgram = activeDetectionProgramFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.PYTHON,
          detectionProgramVersion: pyProgram.id,
        }) as LanguageDetectionPrograms;

        detectionProgramRepository.findByRuleId.mockResolvedValue([
          tsProgram,
          pyProgram,
        ]);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [tsActiveProgram, pyActiveProgram],
        );

        detectionProgramRepository.add.mockImplementation(
          async (program: DetectionProgram) => program,
        );
        activeDetectionProgramRepository.add.mockImplementation(
          async (active) => active,
        );

        result = await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });
      });

      it('returns copied programs count of 2', () => {
        expect(result.copiedProgramsCount).toBe(2);
      });

      it('calls add on detection program repository twice', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledTimes(2);
      });

      it('calls add on active detection program repository twice', () => {
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when old rule has detection programs with metadata', () => {
    let result: { copiedProgramsCount: number; copiedMetadataCount: number };
    let detectionProgram: DetectionProgram;
    let metadata: DetectionProgramMetadata;

    beforeEach(async () => {
      detectionProgram = detectionProgramFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        version: 1,
      });

      metadata = detectionProgramMetadataFactory({
        detectionProgramId: detectionProgram.id,
        programDescription: 'Detects unused imports',
        tokens: { input: 100, output: 200 },
        logs: [
          { timestamp: Date.now(), message: 'AI_AGENT_PROGRAM_SUCCESSFUL' },
        ],
      });

      detectionProgramRepository.findByRuleId.mockResolvedValue([
        detectionProgram,
      ]);
      activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
        [],
      );
      detectionProgramRepository.add.mockImplementation(
        async (program: DetectionProgram) => program,
      );
      detectionProgramMetadataRepository.findByDetectionProgramIds.mockResolvedValue(
        [metadata],
      );

      result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });
    });

    it('returns copied metadata count of 1', () => {
      expect(result.copiedMetadataCount).toBe(1);
    });

    it('adds metadata with new detection program ID', () => {
      expect(detectionProgramMetadataRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          programDescription: 'Detects unused imports',
          tokens: { input: 100, output: 200 },
        }),
      );
    });

    it('generates new ID for copied metadata', () => {
      const addedMetadata =
        detectionProgramMetadataRepository.add.mock.calls[0][0];
      expect(addedMetadata.id).not.toBe(metadata.id);
    });

    it('maps metadata to new detection program ID', () => {
      const addedMetadata =
        detectionProgramMetadataRepository.add.mock.calls[0][0];
      expect(addedMetadata.detectionProgramId).not.toBe(detectionProgram.id);
    });

    it('copies execution logs to new metadata', () => {
      expect(detectionProgramMetadataRepository.addLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'AI_AGENT_PROGRAM_SUCCESSFUL',
        }),
        expect.any(String),
      );
    });
  });

  describe('when old rule has detection programs without metadata', () => {
    let result: { copiedProgramsCount: number; copiedMetadataCount: number };

    beforeEach(async () => {
      const detectionProgram = detectionProgramFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      detectionProgramRepository.findByRuleId.mockResolvedValue([
        detectionProgram,
      ]);
      activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
        [],
      );
      detectionProgramRepository.add.mockImplementation(
        async (program: DetectionProgram) => program,
      );
      detectionProgramMetadataRepository.findByDetectionProgramIds.mockResolvedValue(
        [],
      );

      result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });
    });

    it('returns zero copied metadata count', () => {
      expect(result.copiedMetadataCount).toBe(0);
    });

    it('does not call add on metadata repository', () => {
      expect(detectionProgramMetadataRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when old rule has no detection programs', () => {
    let result: { copiedProgramsCount: number };

    beforeEach(async () => {
      detectionProgramRepository.findByRuleId.mockResolvedValue([]);

      result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });
    });

    it('returns zero copied programs count', () => {
      expect(result.copiedProgramsCount).toBe(0);
    });

    it('does not call add on detection program repository', () => {
      expect(detectionProgramRepository.add).not.toHaveBeenCalled();
    });

    it('does not call findByRuleIdWithPrograms on active detection program repository', () => {
      expect(
        activeDetectionProgramRepository.findByRuleIdWithPrograms,
      ).not.toHaveBeenCalled();
    });

    it('does not call add on active detection program repository', () => {
      expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when old rule has detection programs but no active programs', () => {
    let result: { copiedProgramsCount: number };

    beforeEach(async () => {
      const detectionProgram = detectionProgramFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
      });

      detectionProgramRepository.findByRuleId.mockResolvedValue([
        detectionProgram,
      ]);
      activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
        [],
      );

      detectionProgramRepository.add.mockImplementation(
        async (program: DetectionProgram) => program,
      );

      result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });
    });

    it('returns copied programs count of 1', () => {
      expect(result.copiedProgramsCount).toBe(1);
    });

    it('calls add on detection program repository once', () => {
      expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
    });

    it('does not call add on active detection program repository', () => {
      expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
    });
  });
});
