import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
} from '@packmind/types';
import { CopyRuleDetectionAssessmentsUseCase } from './copyRuleDetectionAssessments.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { ruleDetectionAssessmentFactory } from '../../../../test/ruleDetectionAssessmentFactory';
import { v4 as uuidv4 } from 'uuid';

describe('CopyRuleDetectionAssessmentsUseCase', () => {
  let useCase: CopyRuleDetectionAssessmentsUseCase;
  let repositories: jest.Mocked<ILinterRepositories>;
  let ruleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;

  const oldRuleId = createRuleId(uuidv4());
  const newRuleId = createRuleId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  beforeEach(() => {
    ruleDetectionAssessmentRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as jest.Mocked<IRuleDetectionAssessmentRepository>;

    repositories = {
      getRuleDetectionAssessmentRepository: jest.fn(
        () => ruleDetectionAssessmentRepository,
      ),
    } as unknown as jest.Mocked<ILinterRepositories>;

    useCase = new CopyRuleDetectionAssessmentsUseCase(repositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when old rule has detection assessments', () => {
    it('copies all assessments with new IDs and new ruleId', async () => {
      const assessment1 = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: RuleDetectionAssessmentStatus.SUCCESS,
      });
      const assessment2 = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.PYTHON,
        status: RuleDetectionAssessmentStatus.NOT_STARTED,
      });

      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([
        assessment1,
        assessment2,
      ]);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedAssessmentsCount).toBe(2);
      expect(ruleDetectionAssessmentRepository.add).toHaveBeenCalledTimes(2);

      const firstCall = ruleDetectionAssessmentRepository.add.mock.calls[0][0];
      expect(firstCall.ruleId).toBe(newRuleId);
      expect(firstCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      expect(firstCall.status).toBe(RuleDetectionAssessmentStatus.SUCCESS);
      expect(firstCall.id).not.toBe(assessment1.id);

      const secondCall = ruleDetectionAssessmentRepository.add.mock.calls[1][0];
      expect(secondCall.ruleId).toBe(newRuleId);
      expect(secondCall.language).toBe(ProgrammingLanguage.PYTHON);
      expect(secondCall.status).toBe(RuleDetectionAssessmentStatus.NOT_STARTED);
      expect(secondCall.id).not.toBe(assessment2.id);
    });

    it('preserves status as SUCCESS', async () => {
      const assessment = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: RuleDetectionAssessmentStatus.SUCCESS,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        details: 'Assessment succeeded',
      });

      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([
        assessment,
      ]);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedAssessment =
        ruleDetectionAssessmentRepository.add.mock.calls[0][0];
      expect(copiedAssessment.status).toBe(
        RuleDetectionAssessmentStatus.SUCCESS,
      );
      expect(copiedAssessment.details).toBe('Assessment succeeded');
    });

    it('preserves status as FAILED', async () => {
      const assessment = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.JAVA,
        status: RuleDetectionAssessmentStatus.FAILED,
        detectionMode: DetectionModeEnum.REGEXP,
        details: 'Assessment failed',
      });

      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([
        assessment,
      ]);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedAssessment =
        ruleDetectionAssessmentRepository.add.mock.calls[0][0];
      expect(copiedAssessment.status).toBe(
        RuleDetectionAssessmentStatus.FAILED,
      );
      expect(copiedAssessment.details).toBe('Assessment failed');
    });

    it('preserves status as NOT_STARTED', async () => {
      const assessment = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.GO,
        status: RuleDetectionAssessmentStatus.NOT_STARTED,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        details: '',
      });

      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([
        assessment,
      ]);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedAssessment =
        ruleDetectionAssessmentRepository.add.mock.calls[0][0];
      expect(copiedAssessment.status).toBe(
        RuleDetectionAssessmentStatus.NOT_STARTED,
      );
    });

    it('preserves language, detectionMode, and details', async () => {
      const assessment = ruleDetectionAssessmentFactory({
        ruleId: oldRuleId,
        language: ProgrammingLanguage.RUST,
        status: RuleDetectionAssessmentStatus.SUCCESS,
        detectionMode: DetectionModeEnum.FILE_SYSTEM,
        details: 'Detailed assessment results',
      });

      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([
        assessment,
      ]);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );

      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      const copiedAssessment =
        ruleDetectionAssessmentRepository.add.mock.calls[0][0];
      expect(copiedAssessment.language).toBe(ProgrammingLanguage.RUST);
      expect(copiedAssessment.detectionMode).toBe(
        DetectionModeEnum.FILE_SYSTEM,
      );
      expect(copiedAssessment.details).toBe('Detailed assessment results');
    });
  });

  describe('when old rule has no detection assessments', () => {
    it('returns 0 without attempting to copy', async () => {
      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([]);

      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedAssessmentsCount).toBe(0);
      expect(ruleDetectionAssessmentRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when repository throws error', () => {
    it('logs error and re-throws', async () => {
      const error = new Error('Database connection failed');
      ruleDetectionAssessmentRepository.findByRuleId.mockRejectedValue(error);

      await expect(
        useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
