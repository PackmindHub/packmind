import {
  createOrganizationId,
  createUserId,
  createRuleId,
  DetectionProgram,
  DetectionModeEnum,
  createDetectionProgramId,
  DetectionStatus,
  ProgrammingLanguage,
} from '@packmind/types';
import { GetAllDetectionProgramsByRuleUseCase } from './GetAllDetectionProgramsByRuleUseCase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { stubLogger } from '@packmind/test-utils';

describe('GetAllDetectionProgramsByRuleUseCase', () => {
  let useCase: GetAllDetectionProgramsByRuleUseCase;
  let mockLinterRepositories: jest.Mocked<ILinterRepositories>;
  let mockDetectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;

  const mockRuleId = createRuleId('rule-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockUserId = createUserId('user-123');

  beforeEach(() => {
    mockDetectionProgramRepository = {
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      save: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    mockLinterRepositories = {
      getDetectionProgramRepository: jest.fn(
        () => mockDetectionProgramRepository,
      ),
      getActiveDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    useCase = new GetAllDetectionProgramsByRuleUseCase(
      mockLinterRepositories,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when programs exist for a rule', () => {
    const mockPrograms: DetectionProgram[] = [
      {
        id: createDetectionProgramId('prog-1'),
        code: 'const x = 1;',
        version: 2,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        createdAt: new Date(),
      },
      {
        id: createDetectionProgramId('prog-2'),
        code: 'const y = 2;',
        version: 1,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockDetectionProgramRepository.findByRuleId.mockResolvedValue(
        mockPrograms,
      );
    });

    it('returns all detection programs for the rule', async () => {
      const result = await useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.programs).toEqual(mockPrograms);
    });

    it('calls repository with the correct rule id', async () => {
      await useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(mockDetectionProgramRepository.findByRuleId).toHaveBeenCalledWith(
        mockRuleId,
      );
    });
  });

  describe('when programs with multiple languages exist', () => {
    const mockPrograms: DetectionProgram[] = [
      {
        id: createDetectionProgramId('prog-1'),
        code: 'const x = 1;',
        version: 2,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        createdAt: new Date(),
      },
      {
        id: createDetectionProgramId('prog-2'),
        code: 'const y = 2;',
        version: 1,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        createdAt: new Date(),
      },
      {
        id: createDetectionProgramId('prog-3'),
        code: 'def z = 3',
        version: 1,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: mockRuleId,
        language: ProgrammingLanguage.PYTHON,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockDetectionProgramRepository.findByRuleId.mockResolvedValue(
        mockPrograms,
      );
    });

    it('returns all programs including multiple languages', async () => {
      const result = await useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.programs).toEqual(mockPrograms);
    });
  });

  describe('when no programs exist', () => {
    beforeEach(() => {
      mockDetectionProgramRepository.findByRuleId.mockResolvedValue([]);
    });

    it('returns empty array', async () => {
      const result = await useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.programs).toEqual([]);
    });

    it('calls repository with the correct rule id', async () => {
      await useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(mockDetectionProgramRepository.findByRuleId).toHaveBeenCalledWith(
        mockRuleId,
      );
    });
  });

  it('propagates repository errors', async () => {
    const error = new Error('Repository error');
    mockDetectionProgramRepository.findByRuleId.mockRejectedValue(error);

    await expect(
      useCase.execute({
        ruleId: mockRuleId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      }),
    ).rejects.toThrow('Repository error');
  });
});
