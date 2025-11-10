import { AssessRuleDetectionUseCase } from './assessRuleDetection.usecase';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  IStandardsPort,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
  AssessRuleDetectionJobCommand,
} from '@packmind/types';
import { ruleFactory } from '@packmind/standards/test';
import { stubLogger } from '@packmind/test-utils';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { v4 as uuidv4 } from 'uuid';
import { RuleDetectionAssessmentService } from './RuleDetectionAssessmentService';

// Mock RuleDetectionAssessmentService
jest.mock('./RuleDetectionAssessmentService');

describe('AssessRuleDetectionUseCase', () => {
  let assessRuleDetectionUseCase: AssessRuleDetectionUseCase;
  let ruleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    ruleDetectionAssessmentRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      get: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionAssessmentRepository>;

    linterRepositories = {
      getRuleDetectionAssessmentRepository: jest
        .fn()
        .mockReturnValue(ruleDetectionAssessmentRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
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
      getRuleCodeExamples: jest.fn().mockResolvedValue([
        {
          id: 'example-1',
          positive: 'const x = 1;',
          negative: 'var x = 1;',
          lang: ProgrammingLanguage.TYPESCRIPT,
        },
        {
          id: 'example-2',
          positive: 'const y = 2;',
          negative: 'var y = 2;',
          lang: ProgrammingLanguage.JAVASCRIPT,
        },
      ]),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    };

    stubbedLogger = stubLogger();

    assessRuleDetectionUseCase = new AssessRuleDetectionUseCase(
      linterRepositories,
      standardsAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when assessment is feasible', () => {
    it('updates assessment with SUCCESS status and returns output', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-123',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId,
      };

      // Mock RuleDetectionAssessmentService to return feasible
      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: jest.fn().mockResolvedValue({
              feasible: true,
              reason: ['Rule is detectable with AST'],
            }),
          }) as unknown as RuleDetectionAssessmentService,
      );

      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.assessmentId).toBe(assessmentId);
      expect(result.status).toBe(RuleDetectionAssessmentStatus.SUCCESS);
      expect(result.feasible).toBe(true);
      expect(result.details).toBe('- Rule is detectable with AST');
    });

    it('filters examples by language before assessment', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-123',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId,
      };

      const mockRunFeasibility = jest.fn().mockResolvedValue({
        feasible: true,
        reason: [],
      });
      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: mockRunFeasibility,
          }) as unknown as RuleDetectionAssessmentService,
      );

      await assessRuleDetectionUseCase.execute(command);

      expect(mockRunFeasibility).toHaveBeenCalledWith(
        expect.objectContaining({
          rule,
          language: ProgrammingLanguage.TYPESCRIPT,
          ruleExamples: [
            expect.objectContaining({
              lang: ProgrammingLanguage.TYPESCRIPT,
            }),
          ],
        }),
      );
    });
  });

  describe('when assessment is not feasible', () => {
    it('updates assessment with FAILED status and formats reasons as bullet points', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Complex rule requiring human judgment',
      });
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-456',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId,
      };

      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: jest.fn().mockResolvedValue({
              feasible: false,
              reason: [
                'Requires semantic understanding',
                'Cannot be detected with AST alone',
              ],
            }),
          }) as unknown as RuleDetectionAssessmentService,
      );

      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.status).toBe(RuleDetectionAssessmentStatus.FAILED);
      expect(result.feasible).toBe(false);
      expect(result.details).toBe(
        '- Requires semantic understanding\n- Cannot be detected with AST alone',
      );
    });
  });

  describe('when assessment service throws error', () => {
    it('propagates the error', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Test rule',
      });
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-789',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId: createRuleDetectionAssessmentId(uuidv4()),
      };

      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: jest
              .fn()
              .mockRejectedValue(new Error('AI service unavailable')),
          }) as unknown as RuleDetectionAssessmentService,
      );

      await expect(assessRuleDetectionUseCase.execute(command)).rejects.toThrow(
        'AI service unavailable',
      );
    });
  });

  describe('assessment entity creation', () => {
    it('creates assessment with SINGLE_AST detection mode', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-123',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId,
      };

      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: jest.fn().mockResolvedValue({
              feasible: true,
              reason: ['Detectable'],
            }),
          }) as unknown as RuleDetectionAssessmentService,
      );

      await assessRuleDetectionUseCase.execute(command);

      expect(ruleDetectionAssessmentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: assessmentId,
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionMode: DetectionModeEnum.SINGLE_AST,
        }),
      );
    });
  });
});
