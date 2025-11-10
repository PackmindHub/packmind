import { StartRuleDetectionAssessmentUseCase } from './startRuleDetectionAssessment.usecase';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  IStandardsPort,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
} from '@packmind/types';
import { SSEEventPublisher } from '@packmind/node-utils';
import { ruleFactory } from '@packmind/standards/test';
import { stubLogger } from '@packmind/test-utils';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { ILinterDelayedJobs } from '../../../domain/jobs/ILinterDelayedJobs';
import { AssessRuleDetectionDelayedJob } from '../assessRuleDetection/AssessRuleDetectionDelayedJob';
import { v4 as uuidv4 } from 'uuid';

jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    SSEEventPublisher: {
      publishAssessmentStatusEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('StartRuleDetectionAssessmentUseCase', () => {
  let startRuleDetectionAssessmentUseCase: StartRuleDetectionAssessmentUseCase;
  let ruleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let linterDelayedJobs: jest.Mocked<ILinterDelayedJobs>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let mockAssessRuleDetectionDelayedJob: jest.Mocked<AssessRuleDetectionDelayedJob>;

  beforeEach(() => {
    ruleDetectionAssessmentRepository = {
      add: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      update: jest.fn(),
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

    mockAssessRuleDetectionDelayedJob = {
      addJob: jest.fn().mockResolvedValue('job-123'),
    } as unknown as jest.Mocked<AssessRuleDetectionDelayedJob>;

    linterDelayedJobs = {
      assessRuleDetectionDelayedJob: mockAssessRuleDetectionDelayedJob,
      generateProgramDelayedJob: jest.fn(),
    } as unknown as jest.Mocked<ILinterDelayedJobs>;

    standardsAdapter = {
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
    };

    stubbedLogger = stubLogger();

    startRuleDetectionAssessmentUseCase =
      new StartRuleDetectionAssessmentUseCase(
        linterRepositories,
        linterDelayedJobs,
        standardsAdapter,
        stubbedLogger,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no assessment exists', () => {
    it('creates assessment with NOT_STARTED status', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const result = await startRuleDetectionAssessmentUseCase.execute(input);

      expect(result).toEqual(
        expect.objectContaining({
          status: RuleDetectionAssessmentStatus.NOT_STARTED,
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionMode: DetectionModeEnum.SINGLE_AST,
          details: 'Assessment in progress...',
        }),
      );
    });

    it('saves assessment to database before enqueuing job', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      await startRuleDetectionAssessmentUseCase.execute(input);

      expect(ruleDetectionAssessmentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: rule.id,
          language: ProgrammingLanguage.TYPESCRIPT,
          status: RuleDetectionAssessmentStatus.NOT_STARTED,
          detectionMode: DetectionModeEnum.SINGLE_AST,
        }),
      );
    });

    it('enqueues job with assessment ID', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const result = await startRuleDetectionAssessmentUseCase.execute(input);

      expect(mockAssessRuleDetectionDelayedJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          rule,
          organizationId: input.organizationId,
          userId: input.userId,
          language: input.language,
          assessmentId: result.id,
        }),
      );
    });

    it('publishes an assessment status change event', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const publishAssessmentStatusEventSpy = jest.mocked(
        SSEEventPublisher.publishAssessmentStatusEvent,
      );

      await startRuleDetectionAssessmentUseCase.execute(input);

      expect(publishAssessmentStatusEventSpy).toHaveBeenCalledWith(
        rule.id,
        ProgrammingLanguage.TYPESCRIPT,
        input.userId,
        input.organizationId,
      );
    });

    it('returns the created assessment', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const result = await startRuleDetectionAssessmentUseCase.execute(input);

      expect(result).toMatchObject({
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: RuleDetectionAssessmentStatus.NOT_STARTED,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        details: 'Assessment in progress...',
      });
      expect(result.id).toBeDefined();
    });
  });

  describe('when assessment already exists', () => {
    it('reuses existing assessment and enqueues job', async () => {
      const rule = ruleFactory({
        id: createRuleId(uuidv4()),
        content: 'Use const instead of var',
      });
      const input = {
        rule,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const existingAssessment: RuleDetectionAssessment = {
        id: createRuleDetectionAssessmentId(uuidv4()),
        ruleId: rule.id,
        language: ProgrammingLanguage.TYPESCRIPT,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.SUCCESS,
        details: 'Previous assessment completed',
      };

      ruleDetectionAssessmentRepository.get.mockResolvedValue(
        existingAssessment,
      );

      const result = await startRuleDetectionAssessmentUseCase.execute(input);

      expect(result).toEqual(existingAssessment);
      expect(ruleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
        rule.id,
        ProgrammingLanguage.TYPESCRIPT,
      );
      expect(ruleDetectionAssessmentRepository.add).not.toHaveBeenCalled();
      expect(mockAssessRuleDetectionDelayedJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          rule,
          organizationId: input.organizationId,
          userId: input.userId,
          language: input.language,
          assessmentId: existingAssessment.id,
        }),
      );
    });
  });

  it('propagates errors from repository', async () => {
    const rule = ruleFactory({
      id: createRuleId(uuidv4()),
      content: 'Test rule',
    });
    const input = {
      rule,
      organizationId: createOrganizationId(uuidv4()),
      userId: createUserId(uuidv4()),
      language: ProgrammingLanguage.TYPESCRIPT,
    };

    ruleDetectionAssessmentRepository.add.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(
      startRuleDetectionAssessmentUseCase.execute(input),
    ).rejects.toThrow('Database error');
  });

  it('propagates errors from job queue', async () => {
    const rule = ruleFactory({
      id: createRuleId(uuidv4()),
      content: 'Test rule',
    });
    const input = {
      rule,
      organizationId: createOrganizationId(uuidv4()),
      userId: createUserId(uuidv4()),
      language: ProgrammingLanguage.TYPESCRIPT,
    };

    mockAssessRuleDetectionDelayedJob.addJob.mockRejectedValue(
      new Error('Queue error'),
    );

    await expect(
      startRuleDetectionAssessmentUseCase.execute(input),
    ).rejects.toThrow('Queue error');
  });
});
