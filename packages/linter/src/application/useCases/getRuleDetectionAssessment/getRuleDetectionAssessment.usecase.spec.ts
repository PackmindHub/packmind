import {
  createOrganizationId,
  createRuleDetectionAssessmentId,
  createRuleId,
  createUserId,
  DetectionModeEnum,
  IAccountsPort,
  Organization,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  User,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { GetRuleDetectionAssessmentUseCase } from './getRuleDetectionAssessment.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';

describe('GetRuleDetectionAssessmentUseCase', () => {
  let useCase: GetRuleDetectionAssessmentUseCase;
  let mockLinterRepositories: jest.Mocked<ILinterRepositories>;
  let mockRuleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;

  const mockRuleId = createRuleId('rule-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockUserId = createUserId('user-123');

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

    mockLinterRepositories = {
      getRuleDetectionAssessmentRepository: jest.fn(
        () => mockRuleDetectionAssessmentRepository,
      ),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    // Setup default mocks for user and organization
    const user: User = {
      id: mockUserId,
      email: 'test@example.com',
      passwordHash: 'hashed',
      memberships: [
        {
          organizationId: mockOrganizationId,
          role: 'member',
          userId: mockUserId,
        },
      ],
      active: true,
    };
    const organization: Organization = {
      id: mockOrganizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    mockAccountsPort.getUserById.mockResolvedValue(user);
    mockAccountsPort.getOrganizationById.mockResolvedValue(organization);

    useCase = new GetRuleDetectionAssessmentUseCase(
      mockLinterRepositories,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when assessment exists for rule and language', () => {
    const mockAssessment: RuleDetectionAssessment = {
      id: createRuleDetectionAssessmentId('assessment-1'),
      ruleId: mockRuleId,
      language: ProgrammingLanguage.TYPESCRIPT,
      detectionMode: DetectionModeEnum.SINGLE_AST,
      status: RuleDetectionAssessmentStatus.SUCCESS,
      details: 'Assessment completed successfully',
      clarificationQuestion: '',
      clarificationAnswers: [],
    };

    beforeEach(() => {
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(
        mockAssessment,
      );
    });

    it('returns the assessment', async () => {
      const result = await useCase.execute({
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.assessment).toEqual(mockAssessment);
    });

    it('queries the repository with rule and language', async () => {
      await useCase.execute({
        ruleId: mockRuleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(mockRuleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
        mockRuleId,
        ProgrammingLanguage.TYPESCRIPT,
      );
    });
  });

  describe('when assessment does not exist', () => {
    beforeEach(() => {
      mockRuleDetectionAssessmentRepository.get.mockResolvedValue(null);
    });

    it('returns null', async () => {
      const result = await useCase.execute({
        ruleId: mockRuleId,
        language: ProgrammingLanguage.PYTHON,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.assessment).toBeNull();
    });

    it('queries the repository with rule and language', async () => {
      await useCase.execute({
        ruleId: mockRuleId,
        language: ProgrammingLanguage.PYTHON,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(mockRuleDetectionAssessmentRepository.get).toHaveBeenCalledWith(
        mockRuleId,
        ProgrammingLanguage.PYTHON,
      );
    });
  });

  it('propagates repository errors', async () => {
    const error = new Error('Repository error');
    mockRuleDetectionAssessmentRepository.get.mockRejectedValue(error);

    await expect(
      useCase.execute({
        ruleId: mockRuleId,
        language: ProgrammingLanguage.JAVASCRIPT,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      }),
    ).rejects.toThrow('Repository error');
  });
});
