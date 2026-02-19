import {
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  createOrganizationId,
  createRuleExampleId,
  createRuleId,
  createStandardId,
  createStandardVersionId,
  createUserId,
  DetectionSeverity,
  IAccountsPort,
  IComputeRuleLanguageDetectionStatusUseCase,
  IStandardsPort,
  Organization,
  ProgrammingLanguage,
  Rule,
  RuleExample,
  RuleLanguageDetectionStatus,
  User,
} from '@packmind/types';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { stubLogger } from '@packmind/test-utils';
import { GetStandardRulesDetectionStatusUseCase } from './getStandardRulesDetectionStatus.usecase';

describe('GetStandardRulesDetectionStatusUseCase', () => {
  let useCase: GetStandardRulesDetectionStatusUseCase;
  let mockStandardsAdapter: jest.Mocked<IStandardsPort>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockComputeRuleLanguageDetectionStatusUseCase: jest.Mocked<IComputeRuleLanguageDetectionStatusUseCase>;
  let mockActiveDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;

  const mockStandardId = createStandardId('standard-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockUserId = createUserId('user-123');

  beforeEach(() => {
    mockComputeRuleLanguageDetectionStatusUseCase = {
      execute: jest.fn(),
    } as jest.Mocked<IComputeRuleLanguageDetectionStatusUseCase>;

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
      getLatestStandardVersion: jest.fn(),
    } as jest.Mocked<IStandardsPort>;

    // Default mock for getLatestRulesByStandardId
    mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([]);

    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

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

    mockComputeRuleLanguageDetectionStatusUseCase.execute.mockResolvedValue({
      status: RuleLanguageDetectionStatus.NONE,
    });

    mockActiveDetectionProgramRepository = {
      findByRuleId: jest.fn().mockResolvedValue([]),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      updateSeverity: jest.fn(),
      deleteByRuleId: jest.fn(),
      findById: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    useCase = new GetStandardRulesDetectionStatusUseCase(
      mockAccountsPort,
      mockStandardsAdapter,
      mockComputeRuleLanguageDetectionStatusUseCase,
      mockActiveDetectionProgramRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when standard has multiple rules with examples', () => {
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

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
        rule1,
        rule2,
      ]);
      mockStandardsAdapter.getRuleCodeExamples
        .mockResolvedValueOnce(rule1Examples)
        .mockResolvedValueOnce(rule2Examples);

      result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    it('returns detection status for all rules', async () => {
      expect(result.rules).toHaveLength(2);
    });

    it('returns first rule with correct languages and status', async () => {
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
    });

    it('returns second rule with correct languages and status', async () => {
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
  });

  describe('when rule has duplicate language examples', () => {
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

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);
      mockStandardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

      result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    it('extracts unique languages count', async () => {
      expect(result.rules[0].languages).toHaveLength(2);
    });

    it('includes JavaScript as first language', async () => {
      expect(result.rules[0].languages[0].language).toBe(
        ProgrammingLanguage.JAVASCRIPT,
      );
    });

    it('includes TypeScript as second language', async () => {
      expect(result.rules[0].languages[1].language).toBe(
        ProgrammingLanguage.TYPESCRIPT,
      );
    });
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
    const rule: Rule = {
      id: createRuleId('rule-1'),
      content: 'Test rule',
      standardVersionId: createStandardVersionId('version-id'),
    };

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);
      mockStandardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

      result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    it('returns one rule', async () => {
      expect(result.rules).toHaveLength(1);
    });

    it('returns rule with empty languages array', async () => {
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

  describe('when rule has active detection programs with severity', () => {
    const rule: Rule = {
      id: createRuleId('rule-1'),
      content: 'Test rule',
      standardVersionId: createStandardVersionId('version-id'),
    };

    const examples: RuleExample[] = [
      {
        id: createRuleExampleId('example-1'),
        ruleId: rule.id,
        lang: ProgrammingLanguage.TYPESCRIPT,
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      },
    ];

    const activeDetectionProgramId = createActiveDetectionProgramId('adp-1');

    const activeDetectionProgram: ActiveDetectionProgram = {
      id: activeDetectionProgramId,
      ruleId: rule.id,
      language: ProgrammingLanguage.TYPESCRIPT,
      detectionProgramVersion: null,
      detectionProgramDraftVersion: null,
      severity: DetectionSeverity.WARNING,
    };

    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockStandardsAdapter.getLatestRulesByStandardId.mockResolvedValue([rule]);
      mockStandardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);
      mockComputeRuleLanguageDetectionStatusUseCase.execute.mockResolvedValue({
        status: RuleLanguageDetectionStatus.OK,
      });
      mockActiveDetectionProgramRepository.findByRuleId.mockResolvedValue([
        activeDetectionProgram,
      ]);

      result = await useCase.execute({
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      });
    });

    it('includes severity in the language status', () => {
      expect(result.rules[0].languages[0].severity).toBe(
        DetectionSeverity.WARNING,
      );
    });

    it('includes activeDetectionProgramId in the language status', () => {
      expect(result.rules[0].languages[0].activeDetectionProgramId).toBe(
        activeDetectionProgramId,
      );
    });
  });
});
