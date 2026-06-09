import {
  createRuleId,
  DetectionStatus,
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  createRuleDetectionAssessmentId,
  DetectionModeEnum,
  createDetectionProgramId,
  createActiveDetectionProgramId,
  LanguageDetectionPrograms,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ComputeRuleLanguageDetectionStatusUseCase } from './ComputeRuleLanguageDetectionStatusUseCase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';

describe('ComputeRuleLanguageDetectionStatusUseCase', () => {
  let useCase: ComputeRuleLanguageDetectionStatusUseCase;
  let mockLinterRepositories: jest.Mocked<ILinterRepositories>;
  let mockRuleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let mockActiveDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;

  const mockRuleId = createRuleId('rule-123');
  const language = ProgrammingLanguage.TYPESCRIPT;

  beforeEach(() => {
    mockRuleDetectionAssessmentRepository = {
      get: jest.fn(),
      update: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionAssessmentRepository>;

    mockActiveDetectionProgramRepository = {
      findByRuleIdWithPrograms: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteByRuleId: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    mockLinterRepositories = {
      getRuleDetectionAssessmentRepository: jest.fn(
        () => mockRuleDetectionAssessmentRepository,
      ),
      getActiveDetectionProgramRepository: jest.fn(
        () => mockActiveDetectionProgramRepository,
      ),
      getDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    useCase = new ComputeRuleLanguageDetectionStatusUseCase(
      mockLinterRepositories,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assessment phase (no programs)', () => {
    beforeEach(() => {
      mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
        [],
      );
    });

    it('returns NONE for no assessment', async () => {
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(null);

      const result = await useCase.execute({
        ruleId: mockRuleId,
        language,
      });

      expect(result.status).toBe(RuleLanguageDetectionStatus.NONE);
    });

    it('returns NONE for NOT_STARTED assessment', async () => {
      const assessment: RuleDetectionAssessment = {
        id: createRuleDetectionAssessmentId('assessment-1'),
        ruleId: mockRuleId,
        language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.NOT_STARTED,
        details: '',
        clarificationQuestion: '',
        clarificationAnswers: [],
      };
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(assessment);

      const result = await useCase.execute({
        ruleId: mockRuleId,
        language,
      });

      expect(result.status).toBe(RuleLanguageDetectionStatus.NONE);
    });

    it('returns NONE for FAILED assessment', async () => {
      const assessment: RuleDetectionAssessment = {
        id: createRuleDetectionAssessmentId('assessment-1'),
        ruleId: mockRuleId,
        language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.FAILED,
        details: 'Assessment failed',
        clarificationQuestion: '',
        clarificationAnswers: [],
      };
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(assessment);

      const result = await useCase.execute({
        ruleId: mockRuleId,
        language,
      });

      expect(result.status).toBe(RuleLanguageDetectionStatus.NONE);
    });

    it('returns NONE for IN_PROGRESS assessment', async () => {
      const assessment: RuleDetectionAssessment = {
        id: createRuleDetectionAssessmentId('assessment-1'),
        ruleId: mockRuleId,
        language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.IN_PROGRESS,
        details: 'Assessment in progress',
        clarificationQuestion: '',
        clarificationAnswers: [],
      };
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(assessment);

      const result = await useCase.execute({
        ruleId: mockRuleId,
        language,
      });

      expect(result.status).toBe(RuleLanguageDetectionStatus.NONE);
    });

    it('returns WIP for SUCCESS assessment (transitioning to program phase)', async () => {
      const assessment: RuleDetectionAssessment = {
        id: createRuleDetectionAssessmentId('assessment-1'),
        ruleId: mockRuleId,
        language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status: RuleDetectionAssessmentStatus.SUCCESS,
        details: 'Assessment completed',
        clarificationQuestion: '',
        clarificationAnswers: [],
      };
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(assessment);

      const result = await useCase.execute({
        ruleId: mockRuleId,
        language,
      });

      expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
    });
  });

  describe('program phase (programs exist)', () => {
    describe('when draft is IN_PROGRESS', () => {
      it('returns OK for SUCCESS active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.IN_PROGRESS,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.OK);
      });

      it('returns WIP for TO_REVIEW active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.IN_PROGRESS,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });

      it('returns WIP for no active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: null,
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: null,
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.IN_PROGRESS,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });
    });

    describe('when draft is ERROR', () => {
      it('returns OK for SUCCESS active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.ERROR,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.OK);
      });

      it('returns WIP for TO_REVIEW active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.ERROR,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });

      it('returns WIP for no active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: null,
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: null,
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.ERROR,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });
    });

    describe('when draft is SUCCESS', () => {
      it('returns OK for SUCCESS active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.OK);
      });

      it('returns WIP for TO_REVIEW active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });

      it('returns WIP for no active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: null,
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: null,
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });
    });

    describe('when draft is TO_REVIEW', () => {
      it('returns OK for SUCCESS active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.READY,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.OK);
      });

      it('returns WIP for both draft and active TO_REVIEW', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: createDetectionProgramId('program-1'),
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: {
            id: createDetectionProgramId('program-1'),
            code: 'detection code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 2,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });

      it('returns WIP for no active program', async () => {
        const programWithRelations: LanguageDetectionPrograms = {
          id: createActiveDetectionProgramId('active-1'),
          detectionProgramVersion: null,
          ruleId: mockRuleId,
          language,
          detectionProgramDraftVersion: createDetectionProgramId('draft-1'),
          detectionProgram: null,
          draftDetectionProgram: {
            id: createDetectionProgramId('draft-1'),
            code: 'draft code',
            version: 1,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: mockRuleId,
            language,
            status: DetectionStatus.TO_REVIEW,
            sourceCodeState: 'AST',
          },
        };
        mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [programWithRelations],
        );

        const result = await useCase.execute({
          ruleId: mockRuleId,
          language,
        });

        expect(result.status).toBe(RuleLanguageDetectionStatus.WIP);
      });
    });
  });

  it('propagates repository errors from ActiveDetectionProgramRepository', async () => {
    const error = new Error('Repository error');
    mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockRejectedValue(
      error,
    );

    await expect(
      useCase.execute({
        ruleId: mockRuleId,
        language,
      }),
    ).rejects.toThrow('Repository error');
  });

  it('propagates repository errors from RuleDetectionAssessmentRepository', async () => {
    mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
      [],
    );
    const error = new Error('Assessment repository error');
    mockRuleDetectionAssessmentRepository.get.mockRejectedValue(error);

    await expect(
      useCase.execute({
        ruleId: mockRuleId,
        language,
      }),
    ).rejects.toThrow('Assessment repository error');
  });
});
