import { CopyDetectionProgramsToNewRuleUseCase } from './copyDetectionProgramsToNewRule.usecase';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  DetectionProgram,
  LanguageDetectionPrograms,
} from '@packmind/types';
import {
  detectionProgramFactory,
  activeDetectionProgramFactory,
} from '../../../../test';
import { v4 as uuidv4 } from 'uuid';

describe('CopyDetectionProgramsToNewRuleUseCase', () => {
  let useCase: CopyDetectionProgramsToNewRuleUseCase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
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

    repositories = {
      getDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(detectionProgramRepository),
      getActiveDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(activeDetectionProgramRepository),
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
    it('copies all detection programs with preserved versions and new rule ID', async () => {
      const detectionProgram1 = detectionProgramFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        version: 1,
      });
      const detectionProgram2 = detectionProgramFactory({
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

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedProgramsCount).toBe(2);
      expect(detectionProgramRepository.add).toHaveBeenCalledTimes(2);

      // Verify first program was copied correctly
      const firstCall = detectionProgramRepository.add.mock.calls[0][0];
      expect(firstCall.ruleId).toBe(newRuleId);
      expect(firstCall.version).toBe(1);
      expect(firstCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      expect(firstCall.id).not.toBe(detectionProgram1.id);

      // Verify second program was copied correctly
      const secondCall = detectionProgramRepository.add.mock.calls[1][0];
      expect(secondCall.ruleId).toBe(newRuleId);
      expect(secondCall.version).toBe(1);
      expect(secondCall.language).toBe(ProgrammingLanguage.PYTHON);
      expect(secondCall.id).not.toBe(detectionProgram2.id);
    });

    it('copies active detection programs with correct references to new programs', async () => {
      const detectionProgram = detectionProgramFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        version: 1,
      });

      const activeProgram = activeDetectionProgramFactory({
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

      expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(1);

      const activeCall = activeDetectionProgramRepository.add.mock.calls[0][0];
      expect(activeCall.ruleId).toBe(newRuleId);
      expect(activeCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      expect(activeCall.id).not.toBe(activeProgram.id);
      expect(activeCall.detectionProgramVersion).not.toBe(detectionProgram.id);
      expect(activeCall.detectionProgramVersion).toBeTruthy();
    });

    it('handles active programs with both active and draft versions', async () => {
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

      const activeCall = activeDetectionProgramRepository.add.mock.calls[0][0];
      expect(activeCall.detectionProgramVersion).toBeTruthy();
      expect(activeCall.detectionProgramDraftVersion).toBeTruthy();
      expect(activeCall.detectionProgramVersion).not.toBe(
        activeCall.detectionProgramDraftVersion,
      );
    });

    it('handles multiple languages per rule', async () => {
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

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedProgramsCount).toBe(2);
      expect(detectionProgramRepository.add).toHaveBeenCalledTimes(2);
      expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('when old rule has no detection programs', () => {
    it('returns zero count without attempting to copy anything', async () => {
      detectionProgramRepository.findByRuleId.mockResolvedValue([]);

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedProgramsCount).toBe(0);
      expect(detectionProgramRepository.add).not.toHaveBeenCalled();
      expect(
        activeDetectionProgramRepository.findByRuleIdWithPrograms,
      ).not.toHaveBeenCalled();
      expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when old rule has detection programs but no active programs', () => {
    it('copies detection programs but not active programs', async () => {
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

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedProgramsCount).toBe(1);
      expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
      expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
    });
  });
});
