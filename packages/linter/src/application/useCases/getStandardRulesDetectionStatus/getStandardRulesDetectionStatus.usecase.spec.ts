import { createOrganizationId, createUserId } from '@packmind/accounts';
import {
  UserProvider,
  OrganizationProvider,
  User,
  Organization,
} from '@packmind/types';
import {
  createRuleId,
  createStandardId,
  createStandardVersionId,
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  IStandardsPort,
  Rule,
  RuleExample,
  createRuleExampleId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { GetStandardRulesDetectionStatusUseCase } from './getStandardRulesDetectionStatus.usecase';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IRuleDetectionAssessmentRepository } from '../../../domain/repositories/IRuleDetectionAssessmentRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';

describe('GetStandardRulesDetectionStatusUseCase', () => {
  let useCase: GetStandardRulesDetectionStatusUseCase;
  let mockLinterRepositories: jest.Mocked<ILinterRepositories>;
  let mockStandardsAdapter: jest.Mocked<IStandardsPort>;
  let mockUserProvider: jest.Mocked<UserProvider>;
  let mockOrganizationProvider: jest.Mocked<OrganizationProvider>;
  let mockRuleDetectionAssessmentRepository: jest.Mocked<IRuleDetectionAssessmentRepository>;
  let mockActiveDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;

  const mockStandardId = createStandardId('standard-123');
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

    mockStandardsAdapter = {
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      findStandardBySlug: jest.fn(),
    } as jest.Mocked<IStandardsPort>;

    // Default mock for getLatestRulesByStandardId
    mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([]);

    mockUserProvider = {
      getUserById: jest.fn(),
    } as jest.Mocked<UserProvider>;

    mockOrganizationProvider = {
      getOrganizationById: jest.fn(),
    } as jest.Mocked<OrganizationProvider>;

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

    mockUserProvider.getUserById.mockResolvedValue(user);
    mockOrganizationProvider.getOrganizationById.mockResolvedValue(
      organization,
    );

    mockActiveDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
      [],
    );
    mockRuleDetectionAssessmentRepository.get.mockResolvedValue(null);

    useCase = new GetStandardRulesDetectionStatusUseCase(
      mockUserProvider,
      mockOrganizationProvider,
      mockLinterRepositories,
      mockStandardsAdapter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns detection status for all rules in a standard', async () => {
    const rule1: Rule = {
      id: createRuleId('rule-1'),
      content: 'Use const instead of var',
      standardVersionId: createStandardVersionId('version-id'),
    };

    const rule2: Rule = {
      id: createRuleId('rule-2'),
      content: 'Use async/await instead of callbacks',
      standardVersionId: createStandardVersionId('version-id'),
    };

    const rule1Examples: RuleExample[] = [
      {
        id: createRuleExampleId('example-1'),
        ruleId: rule1.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      },
      {
        id: createRuleExampleId('example-2'),
        ruleId: rule1.id,
        lang: ProgrammingLanguage.TYPESCRIPT,
        positive: 'const x: number = 1;',
        negative: 'var x: number = 1;',
      },
    ];

    const rule2Examples: RuleExample[] = [
      {
        id: createRuleExampleId('example-3'),
        ruleId: rule2.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'await fetchData();',
        negative: 'fetchData(callback);',
      },
    ];

    mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
      rule1,
      rule2,
    ]);
    mockStandardsAdapter.getRuleCodeExamples
      .mockResolvedValueOnce(rule1Examples)
      .mockResolvedValueOnce(rule2Examples);

    const result = await useCase.execute({
      standardId: mockStandardId,
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    expect(result.rules).toHaveLength(2);
    expect(result.rules[0]).toEqual({
      ruleId: rule1.id,
      languages: [
        {
          language: ProgrammingLanguage.JAVASCRIPT,
          status: RuleLanguageDetectionStatus.NONE,
        },
        {
          language: ProgrammingLanguage.TYPESCRIPT,
          status: RuleLanguageDetectionStatus.NONE,
        },
      ],
    });
    expect(result.rules[1]).toEqual({
      ruleId: rule2.id,
      languages: [
        {
          language: ProgrammingLanguage.JAVASCRIPT,
          status: RuleLanguageDetectionStatus.NONE,
        },
      ],
    });
  });

  it('extracts unique languages from rule examples', async () => {
    const rule: Rule = {
      id: createRuleId('rule-1'),
      content: 'Test rule',
      standardVersionId: createStandardVersionId('version-id'),
    };

    const examples: RuleExample[] = [
      {
        id: createRuleExampleId('example-1'),
        ruleId: rule.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'code1',
        negative: 'code2',
      },
      {
        id: createRuleExampleId('example-2'),
        ruleId: rule.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'code3',
        negative: 'code4',
      },
      {
        id: createRuleExampleId('example-3'),
        ruleId: rule.id,
        lang: ProgrammingLanguage.TYPESCRIPT,
        positive: 'code5',
        negative: 'code6',
      },
    ];

    mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);
    mockStandardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

    const result = await useCase.execute({
      standardId: mockStandardId,
      organizationId: mockOrganizationId,
      userId: mockUserId,
    });

    expect(result.rules[0].languages).toHaveLength(2);
    expect(result.rules[0].languages[0].language).toBe(
      ProgrammingLanguage.JAVASCRIPT,
    );
    expect(result.rules[0].languages[1].language).toBe(
      ProgrammingLanguage.TYPESCRIPT,
    );
  });

  describe('when standard has no rules', () => {
    it('returns empty rules array', async () => {
      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([]);

      const result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.rules).toEqual([]);
    });
  });

  describe('when rule has no examples', () => {
    it('returns rule with empty languages array', async () => {
      const rule: Rule = {
        id: createRuleId('rule-1'),
        content: 'Test rule',
        standardVersionId: createStandardVersionId('version-id'),
      };

      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);
      mockStandardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

      const result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toEqual({
        ruleId: rule.id,
        languages: [],
      });
    });
  });

  it('propagates errors from standards adapter', async () => {
    const error = new Error('Standards adapter error');
    mockStandardsAdapter.getLatestRulesByStandardId.mockRejectedValue(error);

    await expect(
      useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      }),
    ).rejects.toThrow('Standards adapter error');
  });

  it('propagates errors from rule examples retrieval', async () => {
    const rule: Rule = {
      id: createRuleId('rule-1'),
      content: 'Test rule',
      standardVersionId: createStandardVersionId('version-id'),
    };

    mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);

    const error = new Error('Failed to get rule examples');
    mockStandardsAdapter.getRuleCodeExamples.mockRejectedValue(error);

    await expect(
      useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      }),
    ).rejects.toThrow('Failed to get rule examples');
  });
});
