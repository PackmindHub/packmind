import { UpdateRuleDetectionStatusAfterUpdateUseCase } from './updateRuleDetectionStatusAfterUpdate.usecase';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  IStandardsPort,
  DetectionStatus,
  ILinterPort,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  DetectionProgram,
  DetectionModeEnum,
  createDetectionProgramId,
} from '@packmind/types';
import { ruleFactory } from '@packmind/standards/test';
import { stubLogger } from '@packmind/test-utils';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { v4 as uuidv4 } from 'uuid';

describe('UpdateRuleDetectionStatusAfterUpdateUseCase', () => {
  let useCase: UpdateRuleDetectionStatusAfterUpdateUseCase;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let ruleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let linterAdapter: jest.Mocked<ILinterPort>;

  const ruleId = createRuleId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const language = ProgrammingLanguage.TYPESCRIPT;

  beforeEach(() => {
    activeDetectionProgramRepository = {
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleId: jest.fn(),
      findById: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteByRuleId: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    ruleDetectionAssessmentRepository = {
      add: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      get: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionAssessmentRepository>;

    detectionProgramRepository = {
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      updateStatus: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    linterRepositories = {
      getActiveDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(activeDetectionProgramRepository),
      getRuleDetectionAssessmentRepository: jest
        .fn()
        .mockReturnValue(ruleDetectionAssessmentRepository),
      getDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(detectionProgramRepository),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    standardsAdapter = {
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn().mockResolvedValue([]),
      findStandardBySlug: jest.fn(),
    };

    linterAdapter = {
      updateDetectionProgramStatus: jest.fn().mockResolvedValue({
        action: 'STATUS_UPDATED',
        message: '',
      }),
      startRuleDetectionAssessment: jest.fn().mockResolvedValue({
        id: 'assessment-id',
        ruleId,
        language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: 'NOT_STARTED',
        details: '',
      }),
    } as unknown as jest.Mocked<ILinterPort>;

    stubbedLogger = stubLogger();

    useCase = new UpdateRuleDetectionStatusAfterUpdateUseCase(
      linterRepositories,
      standardsAdapter,
      () => linterAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no active detection program exists', () => {
    describe('when detection program exists', () => {
      it('returns NO_ACTION', async () => {
        const detectionProgram: DetectionProgram = {
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          language,
          version: 1,
          code: 'test code',
          status: DetectionStatus.FAILURE,
          mode: DetectionModeEnum.REGEXP,
          sourceCodeState: 'RAW',
        };

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          detectionProgram,
        );

        const result = await useCase.execute({
          ruleId,
          organizationId,
          userId,
          language,
        });

        expect(result.action).toBe('NO_ACTION');
        expect(result.message).toBe(
          'Detection program exists, no action taken',
        );
        expect(
          linterAdapter.startRuleDetectionAssessment,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when no detection program exists', () => {
      it('starts new assessment', async () => {
        const rule = ruleFactory({
          id: ruleId,
          content: 'Use const instead of var',
        });

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        standardsAdapter.getRule.mockResolvedValue(rule);

        const result = await useCase.execute({
          ruleId,
          organizationId,
          userId,
          language,
        });

        expect(result.action).toBe('ASSESSMENT_STARTED');
        expect(result.message).toBe('New rule detection assessment started');
        expect(linterAdapter.startRuleDetectionAssessment).toHaveBeenCalledWith(
          {
            rule,
            organizationId,
            userId,
            language,
          },
        );
      });

      describe('when rule not found', () => {
        it('throws error', async () => {
          activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            null,
          );
          detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            null,
          );
          standardsAdapter.getRule.mockResolvedValue(null);

          await expect(
            useCase.execute({
              ruleId,
              organizationId,
              userId,
              language,
            }),
          ).rejects.toThrow(`Rule not found: ${ruleId}`);

          expect(
            linterAdapter.startRuleDetectionAssessment,
          ).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when active detection program exists', () => {
    it('updates status', async () => {
      const activeProgram: ActiveDetectionProgram = {
        id: createActiveDetectionProgramId(uuidv4()),
        ruleId,
        language,
        detectionProgramVersion: null,
        detectionProgramDraftVersion: null,
      };

      activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
        activeProgram,
      );

      const result = await useCase.execute({
        ruleId,
        organizationId,
        userId,
        language,
      });

      expect(result.action).toBe('STATUS_UPDATED');
      expect(result.message).toBe('Detection program status updated');
      expect(
        activeDetectionProgramRepository.findByRuleIdAndLanguage,
      ).toHaveBeenCalledWith(ruleId, language);
      expect(linterAdapter.updateDetectionProgramStatus).toHaveBeenCalledWith({
        ruleId,
        organizationId,
        userId,
        language,
      });
    });
  });
});
