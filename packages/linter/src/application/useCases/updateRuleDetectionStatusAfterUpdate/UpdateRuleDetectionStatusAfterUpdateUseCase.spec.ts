import { UpdateRuleDetectionStatusAfterUpdateUseCase } from './UpdateRuleDetectionStatusAfterUpdateUseCase';
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
  createRuleDetectionAssessmentId,
  RuleDetectionAssessmentStatus,
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
      getLatestStandardVersion: jest.fn(),
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
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
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

        result = await useCase.execute({
          ruleId,
          organizationId,
          userId,
          language,
        });
      });

      it('returns NO_ACTION action', () => {
        expect(result.action).toBe('NO_ACTION');
      });

      it('returns detection program exists message', () => {
        expect(result.message).toBe(
          'Detection program exists, no action taken',
        );
      });

      it('does not start rule detection assessment', () => {
        expect(
          linterAdapter.startRuleDetectionAssessment,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when no detection program exists', () => {
      describe('when assessment already exists', () => {
        describe('when non-FAILED assessment', () => {
          let result: Awaited<ReturnType<typeof useCase.execute>>;

          beforeEach(async () => {
            const existingAssessment = {
              id: createRuleDetectionAssessmentId(uuidv4()),
              ruleId,
              language,
              detectionMode: DetectionModeEnum.SINGLE_AST,
              status: RuleDetectionAssessmentStatus.SUCCESS,
              details: 'Assessment completed',
              clarificationQuestion: null,
              clarificationAnswers: null,
            };

            activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            ruleDetectionAssessmentRepository.get.mockResolvedValue(
              existingAssessment,
            );

            result = await useCase.execute({
              ruleId,
              organizationId,
              userId,
              language,
            });
          });

          it('returns NO_ACTION action', () => {
            expect(result.action).toBe('NO_ACTION');
          });

          it('returns assessment already exists message', () => {
            expect(result.message).toBe(
              'Assessment already exists, no action taken',
            );
          });

          it('gets the assessment by rule id and language', () => {
            expect(ruleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
              ruleId,
              language,
            );
          });

          it('does not start rule detection assessment', () => {
            expect(
              linterAdapter.startRuleDetectionAssessment,
            ).not.toHaveBeenCalled();
          });
        });

        describe('when FAILED assessment exists', () => {
          let result: Awaited<ReturnType<typeof useCase.execute>>;
          let rule: ReturnType<typeof ruleFactory>;

          beforeEach(async () => {
            const failedAssessment = {
              id: createRuleDetectionAssessmentId(uuidv4()),
              ruleId,
              language,
              detectionMode: DetectionModeEnum.SINGLE_AST,
              status: RuleDetectionAssessmentStatus.FAILED,
              details: 'Assessment failed: Not detectable',
              clarificationQuestion: null,
              clarificationAnswers: null,
            };

            rule = ruleFactory({
              id: ruleId,
              content: 'Use const instead of var',
            });

            activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            ruleDetectionAssessmentRepository.get.mockResolvedValue(
              failedAssessment,
            );
            standardsAdapter.getRule.mockResolvedValue(rule);

            result = await useCase.execute({
              ruleId,
              organizationId,
              userId,
              language,
            });
          });

          it('returns ASSESSMENT_STARTED action', () => {
            expect(result.action).toBe('ASSESSMENT_STARTED');
          });

          it('returns failed assessment restarted message', () => {
            expect(result.message).toBe('Failed assessment restarted');
          });

          it('gets the assessment by rule id and language', () => {
            expect(ruleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
              ruleId,
              language,
            );
          });

          it('starts rule detection assessment with correct parameters', () => {
            expect(
              linterAdapter.startRuleDetectionAssessment,
            ).toHaveBeenCalledWith({
              rule,
              organizationId,
              userId,
              language,
            });
          });
        });
      });

      describe('when no assessment exists', () => {
        describe('when rule exists', () => {
          let result: Awaited<ReturnType<typeof useCase.execute>>;
          let rule: ReturnType<typeof ruleFactory>;

          beforeEach(async () => {
            rule = ruleFactory({
              id: ruleId,
              content: 'Use const instead of var',
            });

            activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            ruleDetectionAssessmentRepository.get.mockResolvedValue(null);
            standardsAdapter.getRule.mockResolvedValue(rule);

            result = await useCase.execute({
              ruleId,
              organizationId,
              userId,
              language,
            });
          });

          it('returns ASSESSMENT_STARTED action', () => {
            expect(result.action).toBe('ASSESSMENT_STARTED');
          });

          it('returns new rule detection assessment started message', () => {
            expect(result.message).toBe(
              'New rule detection assessment started',
            );
          });

          it('gets the assessment by rule id and language', () => {
            expect(ruleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
              ruleId,
              language,
            );
          });

          it('starts rule detection assessment with correct parameters', () => {
            expect(
              linterAdapter.startRuleDetectionAssessment,
            ).toHaveBeenCalledWith({
              rule,
              organizationId,
              userId,
              language,
            });
          });
        });

        describe('when rule not found', () => {
          beforeEach(() => {
            activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            detectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
              null,
            );
            ruleDetectionAssessmentRepository.get.mockResolvedValue(null);
            standardsAdapter.getRule.mockResolvedValue(null);
          });

          it('throws error', async () => {
            await expect(
              useCase.execute({
                ruleId,
                organizationId,
                userId,
                language,
              }),
            ).rejects.toThrow(`Rule not found: ${ruleId}`);
          });

          it('does not start rule detection assessment', async () => {
            try {
              await useCase.execute({
                ruleId,
                organizationId,
                userId,
                language,
              });
            } catch {
              // Expected to throw
            }

            expect(
              linterAdapter.startRuleDetectionAssessment,
            ).not.toHaveBeenCalled();
          });
        });
      });
    });
  });

  describe('when active detection program exists', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
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

      result = await useCase.execute({
        ruleId,
        organizationId,
        userId,
        language,
      });
    });

    it('returns STATUS_UPDATED action', () => {
      expect(result.action).toBe('STATUS_UPDATED');
    });

    it('returns detection program status updated message', () => {
      expect(result.message).toBe('Detection program status updated');
    });

    it('finds active detection program by rule id and language', () => {
      expect(
        activeDetectionProgramRepository.findByRuleIdAndLanguage,
      ).toHaveBeenCalledWith(ruleId, language);
    });

    it('updates detection program status with correct parameters', () => {
      expect(linterAdapter.updateDetectionProgramStatus).toHaveBeenCalledWith({
        ruleId,
        organizationId,
        userId,
        language,
      });
    });
  });
});
