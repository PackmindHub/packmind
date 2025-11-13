import { AssessRuleDetectionUseCase } from './assessRuleDetection.usecase';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  IStandardsPort,
  ILinterPort,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
  AssessRuleDetectionJobCommand,
  createDetectionHeuristicsId,
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
  let ruleDetectionHeuristicsRepository: jest.Mocked<IRuleDetectionHeuristicsRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let linterAdapter: jest.Mocked<ILinterPort>;
  let getLinterAdapter: jest.Mock<ILinterPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    ruleDetectionAssessmentRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      get: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionAssessmentRepository>;

    ruleDetectionHeuristicsRepository = {
      upsertHeuristics: jest.fn(),
      getHeuristicsForRule: jest.fn().mockResolvedValue(null),
      updateHeuristics: jest.fn(),
      getHeuristicsById: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionHeuristicsRepository>;

    linterRepositories = {
      getRuleDetectionAssessmentRepository: jest
        .fn()
        .mockReturnValue(ruleDetectionAssessmentRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest
        .fn()
        .mockReturnValue(ruleDetectionHeuristicsRepository),
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

    linterAdapter = {
      createDetectionHeuristics: jest.fn(),
      getDetectionHeuristics: jest.fn(),
      updateRuleDetectionHeuristics: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

    getLinterAdapter = jest.fn().mockReturnValue(linterAdapter);

    stubbedLogger = stubLogger();

    assessRuleDetectionUseCase = new AssessRuleDetectionUseCase(
      linterRepositories,
      standardsAdapter,
      getLinterAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when assessment is feasible', () => {
    let rule: ReturnType<typeof ruleFactory>;
    let assessmentId: ReturnType<typeof createRuleDetectionAssessmentId>;
    let command: AssessRuleDetectionJobCommand;

    beforeEach(() => {
      rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      assessmentId = createRuleDetectionAssessmentId(uuidv4());
      command = {
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
              reason: ['Rule is detectable with AST'],
            }),
          }) as unknown as RuleDetectionAssessmentService,
      );

      linterAdapter.createDetectionHeuristics.mockResolvedValue({
        detectionHeuristics: {
          id: createDetectionHeuristicsId(uuidv4()),
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: [],
        },
      });
    });

    it('returns correct assessment id', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.assessmentId).toBe(assessmentId);
    });

    it('returns SUCCESS status', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.status).toBe(RuleDetectionAssessmentStatus.SUCCESS);
    });

    it('returns feasible as true', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.feasible).toBe(true);
    });

    it('returns formatted details', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.details).toBe('- Rule is detectable with AST');
    });

    it('retrieves existing heuristics for rule', async () => {
      await assessRuleDetectionUseCase.execute(command);

      expect(
        ruleDetectionHeuristicsRepository.getHeuristicsForRule,
      ).toHaveBeenCalledWith(rule.id, ProgrammingLanguage.TYPESCRIPT);
    });

    it('calls createDetectionHeuristics use case', async () => {
      await assessRuleDetectionUseCase.execute(command);

      expect(linterAdapter.createDetectionHeuristics).toHaveBeenCalledWith({
        userId: command.userId,
        organizationId: command.organizationId,
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
      });
    });

    it('filters examples by language before assessment', async () => {
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
        null,
      );
    });
  });

  describe('when assessment is not feasible', () => {
    let rule: ReturnType<typeof ruleFactory>;
    let assessmentId: ReturnType<typeof createRuleDetectionAssessmentId>;
    let command: AssessRuleDetectionJobCommand;

    beforeEach(() => {
      rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Complex rule requiring human judgment',
      });
      assessmentId = createRuleDetectionAssessmentId(uuidv4());
      command = {
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

      linterAdapter.createDetectionHeuristics.mockResolvedValue({
        detectionHeuristics: {
          id: createDetectionHeuristicsId(uuidv4()),
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: [],
        },
      });
    });

    it('returns FAILED status', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.status).toBe(RuleDetectionAssessmentStatus.FAILED);
    });

    it('returns feasible as false', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

      expect(result.feasible).toBe(false);
    });

    it('formats reasons as bullet points', async () => {
      const result = await assessRuleDetectionUseCase.execute(command);

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

  describe('detection heuristics creation', () => {
    it('does not create heuristics if they already exist', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const assessmentId = createRuleDetectionAssessmentId(uuidv4());
      const command: AssessRuleDetectionJobCommand = {
        rule,
        jobId: 'job-existing',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
        assessmentId,
      };

      // Mock existing heuristics
      ruleDetectionHeuristicsRepository.getHeuristicsForRule.mockResolvedValue({
        id: createDetectionHeuristicsId('existing-heuristics-id'),
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristics'],
      });

      const MockedService = RuleDetectionAssessmentService as jest.MockedClass<
        typeof RuleDetectionAssessmentService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            runFeasibilityAssessment: jest.fn().mockResolvedValue({
              feasible: true,
              reason: [],
            }),
          }) as unknown as RuleDetectionAssessmentService,
      );

      await assessRuleDetectionUseCase.execute(command);

      expect(linterAdapter.createDetectionHeuristics).not.toHaveBeenCalled();
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

      linterAdapter.createDetectionHeuristics.mockResolvedValue({
        detectionHeuristics: {
          id: createDetectionHeuristicsId(uuidv4()),
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: [],
        },
      });

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
