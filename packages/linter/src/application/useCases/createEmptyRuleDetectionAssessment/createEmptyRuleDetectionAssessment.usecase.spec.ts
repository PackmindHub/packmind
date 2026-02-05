import {
  createOrganizationId,
  createUserId,
  createRuleId,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
} from '@packmind/types';
import { CreateEmptyRuleDetectionAssessmentUseCase } from './createEmptyRuleDetectionAssessment.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { ruleDetectionAssessmentFactory } from '../../../../test/ruleDetectionAssessmentFactory';
import { v4 as uuidv4 } from 'uuid';

describe('CreateEmptyRuleDetectionAssessmentUseCase', () => {
  let useCase: CreateEmptyRuleDetectionAssessmentUseCase;
  let repositories: jest.Mocked<ILinterRepositories>;
  let ruleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;

  const ruleId = createRuleId(uuidv4());
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

    useCase = new CreateEmptyRuleDetectionAssessmentUseCase(repositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no assessment exists for rule and language', () => {
    beforeEach(() => {
      ruleDetectionAssessmentRepository.get.mockResolvedValue(null);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );
    });

    it('creates assessment with NOT_STARTED status', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.status).toBe(RuleDetectionAssessmentStatus.NOT_STARTED);
    });

    it('creates assessment with correct ruleId', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.ruleId).toBe(ruleId);
    });

    it('creates assessment with correct language', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.language).toBe(ProgrammingLanguage.KOTLIN);
    });

    it('creates assessment with SINGLE_AST detection mode', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.detectionMode).toBe(DetectionModeEnum.SINGLE_AST);
    });

    it('creates assessment with empty details', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.details).toBe('');
    });

    it('creates assessment with null clarificationQuestion', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.clarificationQuestion).toBeNull();
    });

    it('creates assessment with null clarificationAnswers', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result.clarificationAnswers).toBeNull();
    });

    it('stores assessment in repository', async () => {
      await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(ruleDetectionAssessmentRepository.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('when assessment already exists for rule and language', () => {
    const existingAssessment = ruleDetectionAssessmentFactory({
      ruleId,
      language: ProgrammingLanguage.KOTLIN,
      status: RuleDetectionAssessmentStatus.SUCCESS,
      details: 'Already assessed',
    });

    beforeEach(() => {
      ruleDetectionAssessmentRepository.get.mockResolvedValue(
        existingAssessment,
      );
    });

    it('returns the existing assessment', async () => {
      const result = await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(result).toEqual(existingAssessment);
    });

    it('does not create a new assessment', async () => {
      await useCase.execute({
        ruleId,
        language: ProgrammingLanguage.KOTLIN,
        organizationId,
        userId,
      });

      expect(ruleDetectionAssessmentRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when custom status is provided', () => {
    beforeEach(() => {
      ruleDetectionAssessmentRepository.get.mockResolvedValue(null);
      ruleDetectionAssessmentRepository.add.mockImplementation(
        async (assessment: RuleDetectionAssessment) => assessment,
      );
    });

    describe('when program is provided', () => {
      it('creates assessment with SUCCESS', async () => {
        const result = await useCase.execute({
          ruleId,
          language: ProgrammingLanguage.KOTLIN,
          organizationId,
          userId,
          status: RuleDetectionAssessmentStatus.SUCCESS,
        });

        expect(result.status).toBe(RuleDetectionAssessmentStatus.SUCCESS);
      });

      it('creates assessment with custom details', async () => {
        const result = await useCase.execute({
          ruleId,
          language: ProgrammingLanguage.KOTLIN,
          organizationId,
          userId,
          status: RuleDetectionAssessmentStatus.SUCCESS,
          details: 'Imported from legacy data',
        });

        expect(result.details).toBe('Imported from legacy data');
      });
    });
  });

  describe('when repository throws error', () => {
    it('re-throws the error', async () => {
      const error = new Error('Database connection failed');
      ruleDetectionAssessmentRepository.get.mockRejectedValue(error);

      await expect(
        useCase.execute({
          ruleId,
          language: ProgrammingLanguage.KOTLIN,
          organizationId,
          userId,
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
