import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
} from '@packmind/types';
import { CopyRuleDetectionAssessmentsUseCase } from './CopyRuleDetectionAssessmentsUseCase';
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
    describe('when copying multiple assessments', () => {
      let assessment1: RuleDetectionAssessment;
      let assessment2: RuleDetectionAssessment;

      beforeEach(async () => {
        assessment1 = ruleDetectionAssessmentFactory({
          ruleId: oldRuleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          status: RuleDetectionAssessmentStatus.SUCCESS,
        });
        assessment2 = ruleDetectionAssessmentFactory({
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

        await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });
      });

      it('returns correct copied assessments count', async () => {
        const result = await useCase.execute({
          oldRuleId,
          newRuleId,
          organizationId,
          userId,
        });

        expect(result.copiedAssessmentsCount).toBe(2);
      });

      it('calls add for each assessment', () => {
        expect(ruleDetectionAssessmentRepository.add).toHaveBeenCalledTimes(2);
      });

      it('sets new ruleId on first copied assessment', () => {
        const firstCall =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(firstCall.ruleId).toBe(newRuleId);
      });

      it('preserves language on first copied assessment', () => {
        const firstCall =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(firstCall.language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('preserves status on first copied assessment', () => {
        const firstCall =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(firstCall.status).toBe(RuleDetectionAssessmentStatus.SUCCESS);
      });

      it('generates new id for first copied assessment', () => {
        const firstCall =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(firstCall.id).not.toBe(assessment1.id);
      });

      it('sets new ruleId on second copied assessment', () => {
        const secondCall =
          ruleDetectionAssessmentRepository.add.mock.calls[1][0];

        expect(secondCall.ruleId).toBe(newRuleId);
      });

      it('preserves language on second copied assessment', () => {
        const secondCall =
          ruleDetectionAssessmentRepository.add.mock.calls[1][0];

        expect(secondCall.language).toBe(ProgrammingLanguage.PYTHON);
      });

      it('preserves status on second copied assessment', () => {
        const secondCall =
          ruleDetectionAssessmentRepository.add.mock.calls[1][0];

        expect(secondCall.status).toBe(
          RuleDetectionAssessmentStatus.NOT_STARTED,
        );
      });

      it('generates new id for second copied assessment', () => {
        const secondCall =
          ruleDetectionAssessmentRepository.add.mock.calls[1][0];

        expect(secondCall.id).not.toBe(assessment2.id);
      });
    });

    describe('when copying assessment with SUCCESS status', () => {
      beforeEach(async () => {
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
      });

      it('preserves SUCCESS status', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.status).toBe(
          RuleDetectionAssessmentStatus.SUCCESS,
        );
      });

      it('preserves details', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.details).toBe('Assessment succeeded');
      });
    });

    describe('when copying assessment with FAILED status', () => {
      beforeEach(async () => {
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
      });

      it('preserves FAILED status', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.status).toBe(
          RuleDetectionAssessmentStatus.FAILED,
        );
      });

      it('preserves details', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.details).toBe('Assessment failed');
      });
    });

    describe('when copying assessment with NOT_STARTED status', () => {
      it('preserves NOT_STARTED status', async () => {
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
    });

    describe('when copying assessment with all properties', () => {
      beforeEach(async () => {
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
      });

      it('preserves language', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.language).toBe(ProgrammingLanguage.RUST);
      });

      it('preserves detectionMode', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.detectionMode).toBe(
          DetectionModeEnum.FILE_SYSTEM,
        );
      });

      it('preserves details', () => {
        const copiedAssessment =
          ruleDetectionAssessmentRepository.add.mock.calls[0][0];

        expect(copiedAssessment.details).toBe('Detailed assessment results');
      });
    });
  });

  describe('when old rule has no detection assessments', () => {
    beforeEach(() => {
      ruleDetectionAssessmentRepository.findByRuleId.mockResolvedValue([]);
    });

    it('returns 0 copied assessments count', async () => {
      const result = await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(result.copiedAssessmentsCount).toBe(0);
    });

    it('does not call add', async () => {
      await useCase.execute({
        oldRuleId,
        newRuleId,
        organizationId,
        userId,
      });

      expect(ruleDetectionAssessmentRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('when repository throws error', () => {
    it('re-throws the error', async () => {
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
