import { GenerateHeuristicFollowingChatbotInputUseCase } from './GenerateHeuristicFollowingChatbotInputUseCase';
import { HeuristicGenerationService } from './shared/HeuristicGenerationService';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  createDetectionHeuristicsId,
  createRuleId,
  createOrganizationId,
  createUserId,
  createRuleExampleId,
  DetectionHeuristics,
  ProgrammingLanguage,
  UpdateHeuristicsFollowingChatbotInputCommand,
  IStandardsPort,
  Rule,
  RuleExample,
  IAccountsPort,
  ILlmPort,
  AIService,
  AiNotConfigured,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { SSEEventPublisher } from '@packmind/node-utils';
import { v4 as uuidv4 } from 'uuid';

// Mock SSEEventPublisher
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: {
    publishDetectionHeuristicsUpdatedEvent: jest.fn(),
  },
}));

// Mock HeuristicGenerationService
jest.mock('./shared/HeuristicGenerationService');

describe('UpdateHeuristicsFollowingChatbotInputUseCase', () => {
  let useCase: GenerateHeuristicFollowingChatbotInputUseCase;
  let heuristicsRepository: jest.Mocked<IRuleDetectionHeuristicsRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let llmPort: jest.Mocked<ILlmPort>;
  let mockAiService: jest.Mocked<AIService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  beforeEach(() => {
    heuristicsRepository = {
      getHeuristicsById: jest.fn(),
      updateHeuristics: jest.fn(),
      upsertHeuristics: jest.fn(),
      getHeuristicsForRule: jest.fn(),
      getAllHeuristicsForRule: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionHeuristicsRepository>;

    linterRepositories = {
      getRuleDetectionHeuristicsRepository: jest
        .fn()
        .mockReturnValue(heuristicsRepository),
      getRuleDetectionAssessmentRepository: jest.fn(),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    standardsAdapter = {
      getRule: jest.fn(),
      getRuleCodeExamples: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    // Mock accounts port to return a user with membership in ANY organization
    // This is necessary because different test blocks use different organization IDs
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    // Mock AI service
    mockAiService = {
      executePrompt: jest.fn(),
      isConfigured: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AIService>;

    // Mock LLM port
    llmPort = {
      getLlmForOrganization: jest
        .fn()
        .mockResolvedValue({ aiService: mockAiService }),
    } as jest.Mocked<ILlmPort>;

    stubbedLogger = stubLogger();

    useCase = new GenerateHeuristicFollowingChatbotInputUseCase(
      accountsPort,
      linterRepositories,
      standardsAdapter,
      llmPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when updating heuristics successfully', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let command: UpdateHeuristicsFollowingChatbotInputCommand;
    let mockRule: Rule;
    let mockExamples: RuleExample[];

    beforeEach(() => {
      // Setup user/organization mocks for this test block's IDs
      accountsPort.getUserById.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: organizationId,
            role: 'member',
            userId: userId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristic 1', 'existing heuristic 2'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      mockExamples = [
        {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          positive: 'const x = 1;',
          negative: 'var x = 1;',
          lang: ProgrammingLanguage.TYPESCRIPT,
        },
        {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          positive: 'const y = 2;',
          negative: 'var y = 2;',
          lang: ProgrammingLanguage.JAVASCRIPT,
        },
      ];

      command = {
        detectionHeuristicsId: heuristicsId,
        question: 'What code pattern should we detect?',
        answer: 'Variable declarations using var keyword',
        userId,
        organizationId,
      };

      heuristicsRepository.getHeuristicsById.mockResolvedValue(
        existingHeuristics,
      );

      standardsAdapter.getRule.mockResolvedValue(mockRule);
      standardsAdapter.getRuleCodeExamples.mockResolvedValue(mockExamples);

      const MockedService = HeuristicGenerationService as jest.MockedClass<
        typeof HeuristicGenerationService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            generateHeuristic: jest
              .fn()
              .mockResolvedValue('new generated heuristic'),
          }) as unknown as HeuristicGenerationService,
      );
    });

    it('returns generated heuristic', async () => {
      const result = await useCase.execute(command);

      expect(result.newHeuristic).toBe('new generated heuristic');
    });

    it('retrieves existing heuristics by ID', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsById).toHaveBeenCalledWith(
        heuristicsId,
      );
    });

    it('retrieves rule from standards adapter', async () => {
      await useCase.execute(command);

      expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
    });

    it('retrieves rule examples from standards adapter', async () => {
      await useCase.execute(command);

      expect(standardsAdapter.getRuleCodeExamples).toHaveBeenCalledWith(ruleId);
    });

    it('filters examples by language', async () => {
      const mockGenerateHeuristic = jest
        .fn()
        .mockResolvedValue('new generated heuristic');
      const MockedService = HeuristicGenerationService as jest.MockedClass<
        typeof HeuristicGenerationService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            generateHeuristic: mockGenerateHeuristic,
          }) as unknown as HeuristicGenerationService,
      );

      await useCase.execute(command);

      expect(mockGenerateHeuristic).toHaveBeenCalledWith(
        mockRule,
        [mockExamples[0]], // Only TypeScript example
        existingHeuristics.heuristics,
        command.question,
        command.answer,
      );
    });

    it('calls AI service with correct parameters', async () => {
      const mockGenerateHeuristic = jest
        .fn()
        .mockResolvedValue('new generated heuristic');
      const MockedService = HeuristicGenerationService as jest.MockedClass<
        typeof HeuristicGenerationService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            generateHeuristic: mockGenerateHeuristic,
          }) as unknown as HeuristicGenerationService,
      );

      await useCase.execute(command);

      expect(mockGenerateHeuristic).toHaveBeenCalledWith(
        mockRule,
        expect.any(Array),
        existingHeuristics.heuristics,
        command.question,
        command.answer,
      );
    });

    it('does not call repository updateHeuristics method', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.updateHeuristics).not.toHaveBeenCalled();
    });

    it('does not call repository upsertHeuristics method', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.upsertHeuristics).not.toHaveBeenCalled();
    });

    it('does not publish SSE event', async () => {
      await useCase.execute(command);

      expect(
        SSEEventPublisher.publishDetectionHeuristicsUpdatedEvent,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when heuristics not found', () => {
    it('throws error', async () => {
      const testUserId = createUserId(uuidv4());
      const testOrgId = createOrganizationId(uuidv4());

      // Setup user/organization mocks for this test's IDs
      accountsPort.getUserById.mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: testOrgId,
            role: 'member',
            userId: testUserId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      const command: UpdateHeuristicsFollowingChatbotInputCommand = {
        detectionHeuristicsId: createDetectionHeuristicsId(uuidv4()),
        question: 'test question',
        answer: 'test answer',
        userId: testUserId,
        organizationId: testOrgId,
      };

      heuristicsRepository.getHeuristicsById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Detection heuristics with id',
      );
    });
  });

  describe('when rule not found', () => {
    it('throws error', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const testUserId = createUserId(uuidv4());
      const testOrgId = createOrganizationId(uuidv4());

      // Setup user/organization mocks for this test's IDs
      accountsPort.getUserById.mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: testOrgId,
            role: 'member',
            userId: testUserId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      const command: UpdateHeuristicsFollowingChatbotInputCommand = {
        detectionHeuristicsId: heuristicsId,
        question: 'test question',
        answer: 'test answer',
        userId: testUserId,
        organizationId: testOrgId,
      };

      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristic'],
      };

      heuristicsRepository.getHeuristicsById.mockResolvedValue(
        existingHeuristics,
      );
      standardsAdapter.getRule.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow('Rule with id');
    });
  });

  describe('when AI returns EMPTY for unrelated answer', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let command: UpdateHeuristicsFollowingChatbotInputCommand;
    let mockRule: Rule;
    let mockExamples: RuleExample[];

    beforeEach(() => {
      // Setup user/organization mocks for this test block's IDs
      accountsPort.getUserById.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: organizationId,
            role: 'member',
            userId: userId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristic 1'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      mockExamples = [
        {
          id: createRuleExampleId(uuidv4()),
          ruleId,
          positive: 'const x = 1;',
          negative: 'var x = 1;',
          lang: ProgrammingLanguage.TYPESCRIPT,
        },
      ];

      command = {
        detectionHeuristicsId: heuristicsId,
        question: 'What should we detect?',
        answer: 'toto',
        userId,
        organizationId,
      };

      heuristicsRepository.getHeuristicsById.mockResolvedValue(
        existingHeuristics,
      );

      standardsAdapter.getRule.mockResolvedValue(mockRule);
      standardsAdapter.getRuleCodeExamples.mockResolvedValue(mockExamples);
    });

    it('returns empty string', async () => {
      const MockedService = HeuristicGenerationService as jest.MockedClass<
        typeof HeuristicGenerationService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            generateHeuristic: jest.fn().mockResolvedValue(''),
          }) as unknown as HeuristicGenerationService,
      );

      const result = await useCase.execute(command);

      expect(result.newHeuristic).toBe('');
    });

    describe('when using case-insensitive EMPTY variations', () => {
      it('returns empty string', async () => {
        const MockedService = HeuristicGenerationService as jest.MockedClass<
          typeof HeuristicGenerationService
        >;
        MockedService.mockImplementation(
          () =>
            ({
              generateHeuristic: jest.fn().mockResolvedValue(''),
            }) as unknown as HeuristicGenerationService,
        );

        const result = await useCase.execute(command);

        expect(result.newHeuristic).toBe('');
      });
    });

    describe('when EMPTY has whitespace', () => {
      it('returns empty string', async () => {
        const MockedService = HeuristicGenerationService as jest.MockedClass<
          typeof HeuristicGenerationService
        >;
        MockedService.mockImplementation(
          () =>
            ({
              generateHeuristic: jest.fn().mockResolvedValue(''),
            }) as unknown as HeuristicGenerationService,
        );

        const result = await useCase.execute(command);

        expect(result.newHeuristic).toBe('');
      });
    });
  });

  describe('when AI generation fails', () => {
    it('throws error', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const userId = createUserId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());

      // Setup user/organization mocks for this test's IDs
      accountsPort.getUserById.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: organizationId,
            role: 'member',
            userId: userId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      const command: UpdateHeuristicsFollowingChatbotInputCommand = {
        detectionHeuristicsId: heuristicsId,
        question: 'test question',
        answer: 'test answer',
        userId: userId,
        organizationId: organizationId,
      };

      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristic'],
      };

      const mockRule: Rule = {
        id: ruleId,
        content: 'Test rule',
      } as Rule;

      heuristicsRepository.getHeuristicsById.mockResolvedValue(
        existingHeuristics,
      );
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      standardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

      const MockedService = HeuristicGenerationService as jest.MockedClass<
        typeof HeuristicGenerationService
      >;
      MockedService.mockImplementation(
        () =>
          ({
            generateHeuristic: jest
              .fn()
              .mockRejectedValue(new Error('AI generation error')),
          }) as unknown as HeuristicGenerationService,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'AI generation error',
      );
    });
  });

  describe('when AI service is not configured for organization', () => {
    it('throws AiNotConfigured error', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const testUserId = createUserId(uuidv4());
      const testOrgId = createOrganizationId(uuidv4());

      accountsPort.getUserById.mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        memberships: [
          {
            organizationId: testOrgId,
            role: 'member',
            userId: testUserId,
          },
        ],
        active: true,
      });

      accountsPort.getOrganizationById.mockResolvedValue({
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org',
      });

      const command: UpdateHeuristicsFollowingChatbotInputCommand = {
        detectionHeuristicsId: heuristicsId,
        question: 'test question',
        answer: 'test answer',
        userId: testUserId,
        organizationId: testOrgId,
      };

      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['existing heuristic'],
      };

      const mockRule: Rule = {
        id: ruleId,
        content: 'Test rule',
      } as Rule;

      heuristicsRepository.getHeuristicsById.mockResolvedValue(
        existingHeuristics,
      );
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      standardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

      // Mock LLM port returning undefined aiService
      llmPort.getLlmForOrganization.mockResolvedValue({ aiService: undefined });

      await expect(useCase.execute(command)).rejects.toThrow(AiNotConfigured);
    });
  });
});
