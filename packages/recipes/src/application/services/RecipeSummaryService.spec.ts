import { RecipeSummaryService } from './RecipeSummaryService';
import { RecipeVersion } from '../../domain/entities/RecipeVersion';
import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  AIPromptResult,
  AiNotConfigured,
} from '@packmind/node-utils';
import { createRecipeSummaryPrompt } from './cookbook/prompts/create_recipe_summary';
import { stubLogger } from '@packmind/test-utils';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';

// Mock AIService
const mockAIService: jest.Mocked<AIService> = {
  isConfigured: jest.fn(),
  executePrompt: jest.fn(),
  executePromptWithHistory: jest.fn(),
};

// Mock the OpenAIService constructor
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  OpenAIService: jest.fn(() => mockAIService),
}));

describe('RecipeSummaryService', () => {
  let recipeSummaryService: RecipeSummaryService;
  let mockLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockLogger = stubLogger();
    recipeSummaryService = new RecipeSummaryService(mockLogger);
    // Default: AI service is configured unless specified otherwise
    mockAIService.isConfigured.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecipeSummary', () => {
    const mockRecipeVersionData: Omit<RecipeVersion, 'id'> =
      recipeVersionFactory({
        name: 'Test Recipe',
        content: 'This is test recipe content',
      });

    describe('when AI service succeeds', () => {
      it('generates and returns recipe summary', async () => {
        const mockSummary = 'Generated recipe summary';
        const mockResult: AIPromptResult<string> = {
          success: true,
          data: mockSummary,
          attempts: 1,
          model: 'gpt-4o-mini',
        };

        mockAIService.executePrompt.mockResolvedValue(mockResult);

        const result = await recipeSummaryService.createRecipeSummary(
          mockRecipeVersionData,
        );

        expect(result).toBe(mockSummary);
        expect(mockAIService.executePrompt).toHaveBeenCalledWith(
          `${createRecipeSummaryPrompt}\n\n${mockRecipeVersionData.content}`,
        );
      });
    });

    describe('when AI service is not configured', () => {
      it('throws AiNotConfigured error without calling executePrompt', async () => {
        mockAIService.isConfigured.mockResolvedValue(false);

        await expect(
          recipeSummaryService.createRecipeSummary(mockRecipeVersionData),
        ).rejects.toThrow(AiNotConfigured);

        expect(mockAIService.isConfigured).toHaveBeenCalledTimes(1);
        expect(mockAIService.executePrompt).not.toHaveBeenCalled();
      });
    });

    describe('when AI service fails for other reasons', () => {
      it('throws error with failure message', async () => {
        const mockResult: AIPromptResult<string> = {
          success: false,
          data: null,
          error: 'Network error',
          attempts: 3,
          model: 'gpt-4o-mini',
        };

        mockAIService.executePrompt.mockResolvedValue(mockResult);

        await expect(
          recipeSummaryService.createRecipeSummary(mockRecipeVersionData),
        ).rejects.toThrow('Failed to generate recipe summary: Network error');
      });
    });

    describe('when AI service throws an exception', () => {
      it('propagates the exception', async () => {
        const error = new Error('Connection timeout');
        mockAIService.executePrompt.mockRejectedValue(error);

        await expect(
          recipeSummaryService.createRecipeSummary(mockRecipeVersionData),
        ).rejects.toThrow('Connection timeout');
      });
    });
  });
});
