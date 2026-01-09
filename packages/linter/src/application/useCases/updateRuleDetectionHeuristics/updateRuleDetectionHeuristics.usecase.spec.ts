import { UpdateRuleDetectionHeuristicsUseCase } from './updateRuleDetectionHeuristics.usecase';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  createDetectionHeuristicsId,
  createRuleId,
  createOrganizationId,
  createUserId,
  DetectionHeuristics,
  ProgrammingLanguage,
  UpdateRuleDetectionHeuristicsCommand,
  IStandardsPort,
  ILinterPort,
  Rule,
  RuleDetectionAssessment,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { GenerateHeuristicFollowingChatbotInputUsecase } from '../generateHeuristicFollowingChatbotInput/generateHeuristicFollowingChatbotInput.usecase';

// Mock SSEEventPublisher
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: {
    publishDetectionHeuristicsUpdatedEvent: jest.fn(),
  },
}));

// Mock the GenerateHeuristicFollowingChatbotInputUsecase
jest.mock(
  '../generateHeuristicFollowingChatbotInput/generateHeuristicFollowingChatbotInput.usecase',
);

describe('UpdateRuleDetectionHeuristicsUseCase', () => {
  let useCase: UpdateRuleDetectionHeuristicsUseCase;
  let heuristicsRepository: jest.Mocked<IRuleDetectionHeuristicsRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let linterAdapter: jest.Mocked<ILinterPort>;
  let getLinterAdapter: jest.Mock<ILinterPort, []>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let mockChatbotUseCase: jest.Mocked<GenerateHeuristicFollowingChatbotInputUsecase>;

  beforeEach(() => {
    heuristicsRepository = {
      getHeuristicsById: jest.fn(),
      updateHeuristics: jest.fn(),
      upsertHeuristics: jest.fn(),
      getHeuristicsForRule: jest.fn(),
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

    linterAdapter = {
      startRuleDetectionAssessment: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

    getLinterAdapter = jest.fn().mockReturnValue(linterAdapter);

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    stubbedLogger = stubLogger();

    // Mock the chatbot use case
    mockChatbotUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ newHeuristic: 'generated heuristic' }),
    } as unknown as jest.Mocked<GenerateHeuristicFollowingChatbotInputUsecase>;

    (GenerateHeuristicFollowingChatbotInputUsecase as jest.Mock).mockClear();
    (
      GenerateHeuristicFollowingChatbotInputUsecase as jest.Mock
    ).mockImplementation(() => mockChatbotUseCase);

    useCase = new UpdateRuleDetectionHeuristicsUseCase(
      linterRepositories,
      standardsAdapter,
      getLinterAdapter,
      accountsPort,
      null,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when updating heuristics successfully', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    const userId = createUserId(uuidv4());
    const organizationId = createOrganizationId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;
    let mockRule: Rule;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['new heuristics'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockResolvedValue(
        {} as RuleDetectionAssessment,
      );

      command = {
        userId,
        organizationId,
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };
    });

    it('retrieves existing heuristics by id', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsById).toHaveBeenCalledWith(
        heuristicsId,
      );
    });

    it('calls update with correct parameters', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        ['new heuristics'],
      );
    });

    it('returns updated detection heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });

    it('fetches the rule for assessment', async () => {
      await useCase.execute(command);

      expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
    });

    it('triggers rule detection assessment with correct parameters', async () => {
      await useCase.execute(command);

      expect(linterAdapter.startRuleDetectionAssessment).toHaveBeenCalledWith({
        rule: mockRule,
        organizationId,
        userId,
        language: ProgrammingLanguage.TYPESCRIPT,
      });
    });
  });

  describe('when detection heuristics not found', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      heuristicsRepository.getHeuristicsById.mockResolvedValue(null);

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };
    });

    it('throws error indicating heuristics not found', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Detection heuristics with id ${heuristicsId} not found`,
      );
    });

    describe('when heuristics not found', () => {
      it('does not call update', async () => {
        await expect(useCase.execute(command)).rejects.toThrow();

        expect(heuristicsRepository.updateHeuristics).not.toHaveBeenCalled();
      });
    });
  });

  describe('when updating empty heuristics', () => {
    it('allows updating to empty string', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: ['existing heuristics'],
      };

      const updatedHeuristics: DetectionHeuristics = {
        ...existingHeuristics,
        heuristics: [],
      };

      const mockRule: Rule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockResolvedValue(
        {} as RuleDetectionAssessment,
      );

      const command: UpdateRuleDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: [],
      };

      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.heuristics).toEqual([]);
    });
  });

  describe('when retrieval after update fails', () => {
    it('throws error indicating retrieval failure', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.JAVA,
        heuristics: ['old heuristics'],
      };

      const mockRule: Rule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(null);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockResolvedValue(
        {} as RuleDetectionAssessment,
      );

      const command: UpdateRuleDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to retrieve updated heuristics',
      );
    });
  });

  describe('when heuristics property preserves other fields', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;
    let mockRule: Rule;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.GO,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['new heuristics'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockResolvedValue(
        {} as RuleDetectionAssessment,
      );

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };
    });

    it('preserves ruleId field', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.ruleId).toBe(ruleId);
    });

    it('preserves language field', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.language).toBe(ProgrammingLanguage.GO);
    });
  });

  describe('when rule not found for assessment', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['new heuristics'],
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(null);

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };
    });

    it('returns updated heuristics despite missing rule', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });

    it('does not call startRuleDetectionAssessment', async () => {
      await useCase.execute(command);

      expect(linterAdapter.startRuleDetectionAssessment).not.toHaveBeenCalled();
    });
  });

  describe('when assessment fails', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;
    let mockRule: Rule;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.JAVA,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['new heuristics'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockRejectedValue(
        new Error('Assessment service unavailable'),
      );

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
      };
    });

    it('returns updated heuristics despite assessment failure', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });

    it('does not throw error', async () => {
      await expect(useCase.execute(command)).resolves.not.toThrow();
    });
  });

  describe('when skipAssessmentTrigger is true', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    const userId = createUserId(uuidv4());
    const organizationId = createOrganizationId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['new heuristics'],
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();

      command = {
        userId,
        organizationId,
        detectionHeuristicsId: heuristicsId,
        heuristics: ['new heuristics'],
        skipAssessmentTrigger: true,
      };
    });

    it('does not fetch rule for assessment', async () => {
      await useCase.execute(command);

      expect(standardsAdapter.getRule).not.toHaveBeenCalled();
    });

    it('does not start rule detection assessment', async () => {
      await useCase.execute(command);

      expect(linterAdapter.startRuleDetectionAssessment).not.toHaveBeenCalled();
    });

    it('returns updated heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });
  });

  describe('when clarification question is provided', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    const userId = createUserId(uuidv4());
    const organizationId = createOrganizationId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;
    let mockRule: Rule;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: ['old heuristics'],
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: ['old heuristics', 'generated heuristic'],
      };

      mockRule = {
        id: ruleId,
        content: 'Test rule content',
      } as Rule;

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();
      standardsAdapter.getRule.mockResolvedValue(mockRule);
      linterAdapter.startRuleDetectionAssessment.mockResolvedValue(
        {} as RuleDetectionAssessment,
      );

      command = {
        userId,
        organizationId,
        detectionHeuristicsId: heuristicsId,
        heuristics: ['old heuristics'],
        clarificationQuestion: {
          question: 'What should we detect?',
          answer: 'Variables declared with var',
        },
      };
    });

    it('skips clarification if question is empty', async () => {
      command.clarificationQuestion = {
        question: '',
        answer: 'test',
      };

      await useCase.execute(command);

      expect(mockChatbotUseCase.execute).not.toHaveBeenCalled();
      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        ['old heuristics'],
      );
    });

    it('skips clarification if answer is empty', async () => {
      command.clarificationQuestion = {
        question: 'test question',
        answer: '',
      };

      await useCase.execute(command);

      expect(mockChatbotUseCase.execute).not.toHaveBeenCalled();
      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        ['old heuristics'],
      );
    });

    it('appends generated heuristic to heuristics array', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        ['old heuristics', 'generated heuristic'],
      );
    });

    it('returns updated heuristics with generated heuristic', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });

    it('skips appending if generated heuristic is empty', async () => {
      // Mock empty heuristic generation
      mockChatbotUseCase.execute.mockResolvedValueOnce({ newHeuristic: '' });

      heuristicsRepository.getHeuristicsById
        .mockReset()
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce({
          ...existingHeuristics,
          heuristics: ['old heuristics'],
        });

      await useCase.execute(command);

      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        ['old heuristics'],
      );
    });
  });
});
