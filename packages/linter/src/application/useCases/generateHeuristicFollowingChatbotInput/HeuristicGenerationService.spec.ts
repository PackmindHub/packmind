import { HeuristicGenerationService } from './HeuristicGenerationService';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { AIService } from '@packmind/types';
import { Rule, RuleExample, ProgrammingLanguage } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { createRuleId, createRuleExampleId } from '@packmind/types';

describe('HeuristicGenerationService', () => {
  let service: HeuristicGenerationService;
  let mockAiService: jest.Mocked<AIService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const mockRule: Rule = {
    id: createRuleId(uuidv4()),
    content: 'Use const instead of var for variable declarations',
  } as Rule;

  const mockExamples: RuleExample[] = [
    {
      id: createRuleExampleId(uuidv4()),
      ruleId: mockRule.id,
      positive: 'const x = 1;',
      negative: 'var x = 1;',
      lang: ProgrammingLanguage.TYPESCRIPT,
    },
  ];

  beforeEach(() => {
    mockAiService = {
      executePromptWithHistory: jest.fn(),
      isConfigured: jest.fn().mockResolvedValue(true),
      executePrompt: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    stubbedLogger = stubLogger();

    service = new HeuristicGenerationService(mockAiService, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when generating valid heuristic', () => {
    it('returns generated heuristic text', async () => {
      const expectedHeuristic =
        'Detect variable declarations using the var keyword';
      mockAiService.executePromptWithHistory.mockResolvedValue({
        data: expectedHeuristic,
        success: true,
        attempts: 1,
        model: 'test-model',
      });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        ['existing heuristic'],
        'What pattern should we detect?',
        'Variable declarations using var',
      );

      expect(result).toBe(expectedHeuristic);
    });

    it('trims whitespace from AI response', async () => {
      mockAiService.executePromptWithHistory.mockResolvedValue({
        data: '  Detect var keyword  \n',
        success: true,
        attempts: 1,
        model: 'test-model',
      });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        [],
        'What to detect?',
        'var keyword',
      );

      expect(result).toBe('Detect var keyword');
    });
  });

  describe('when AI returns EMPTY for unrelated answer', () => {
    it('returns empty string', async () => {
      mockAiService.executePromptWithHistory.mockResolvedValue({
        data: 'EMPTY',
        success: true,
        attempts: 1,
        model: 'test-model',
      });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        ['existing heuristic'],
        'What should we detect?',
        'toto',
      );

      expect(result).toBe('');
    });

    it('returns empty string for lowercase empty', async () => {
      mockAiService.executePromptWithHistory.mockResolvedValue({
        data: 'empty',
        success: true,
        attempts: 1,
        model: 'test-model',
      });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        [],
        'What pattern?',
        '.',
      );

      expect(result).toBe('');
    });

    it('returns empty string for mixed case Empty', async () => {
      mockAiService.executePromptWithHistory.mockResolvedValue({
        data: 'Empty',
        success: true,
        attempts: 1,
        model: 'test-model',
      });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        [],
        'Question',
        'How are you today?',
      );

      expect(result).toBe('');
    });

    describe('when EMPTY has leading whitespace', () => {
      it('returns empty string', async () => {
        mockAiService.executePromptWithHistory.mockResolvedValue({
          data: '  EMPTY',
          success: true,
          attempts: 1,
          model: 'test-model',
        });

        const result = await service.generateHeuristic(
          mockRule,
          mockExamples,
          [],
          'Question',
          'nonsense',
        );

        expect(result).toBe('');
      });
    });

    describe('when EMPTY has trailing whitespace', () => {
      it('returns empty string', async () => {
        mockAiService.executePromptWithHistory.mockResolvedValue({
          data: 'EMPTY  \n',
          success: true,
          attempts: 1,
          model: 'test-model',
        });

        const result = await service.generateHeuristic(
          mockRule,
          mockExamples,
          [],
          'Question',
          'random',
        );

        expect(result).toBe('');
      });
    });
  });

  describe('when AI service fails', () => {
    it('retries up to MAX_RETRY times', async () => {
      mockAiService.executePromptWithHistory
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: 'Valid heuristic',
          success: true,
          attempts: 3,
          model: 'test-model',
        });

      const result = await service.generateHeuristic(
        mockRule,
        mockExamples,
        [],
        'Question',
        'Answer',
      );

      expect(result).toBe('Valid heuristic');
      expect(mockAiService.executePromptWithHistory).toHaveBeenCalledTimes(3);
    });

    it('throws error after MAX_RETRY attempts', async () => {
      mockAiService.executePromptWithHistory.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.generateHeuristic(
          mockRule,
          mockExamples,
          [],
          'Question',
          'Answer',
        ),
      ).rejects.toThrow('Failed to generate heuristic after maximum retries');

      // AIRequestEmitter has MAX_RETRY=2 (3 attempts total), HeuristicGenerationService has MAX_RETRY=3 (3 attempts)
      // So total calls = 3 * 3 = 9
      expect(mockAiService.executePromptWithHistory).toHaveBeenCalled();
    });

    describe('when AI returns no data', () => {
      it('throws error', async () => {
        mockAiService.executePromptWithHistory.mockResolvedValue({
          data: null,
          success: false,
          attempts: 1,
          model: 'test-model',
        });

        await expect(
          service.generateHeuristic(
            mockRule,
            mockExamples,
            [],
            'Question',
            'Answer',
          ),
        ).rejects.toThrow('Failed to generate heuristic after maximum retries');
      });
    });
  });
});
