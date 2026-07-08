import { RecipeSummaryService } from './RecipeSummaryService';
import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  AIPromptResult,
  AiNotConfigured,
  ILlmPort,
  RecipeVersion,
  createOrganizationId,
} from '@packmind/types';
import { createRecipeSummaryPrompt } from './cookbook/prompts/create_recipe_summary';
import { stubLogger } from '@packmind/test-utils';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';
import { v4 as uuidv4 } from 'uuid';

describe('RecipeSummaryService', () => {
  let recipeSummaryService: RecipeSummaryService;
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockAIService: jest.Mocked<AIService>;
  let mockLlmPort: jest.Mocked<ILlmPort>;
  const testOrganizationId = createOrganizationId(uuidv4());

  beforeEach(() => {
    mockLogger = stubLogger();

    // Mock AIService instance
    mockAIService = {
      isConfigured: jest.fn(),
      executePrompt: jest.fn(),
      executePromptWithHistory: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    // Mock ILlmPort
    mockLlmPort = {
      getLlmForOrganization: jest
        .fn()
        .mockResolvedValue({ aiService: mockAIService }),
    } as jest.Mocked<ILlmPort>;

    recipeSummaryService = new RecipeSummaryService(mockLlmPort, mockLogger);
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
      const mockSummary = 'Generated recipe summary';
      let result: string;

      beforeEach(async () => {
        const mockResult: AIPromptResult<string> = {
          success: true,
          data: mockSummary,
          attempts: 1,
          model: 'gpt-4o-mini',
        };

        mockAIService.executePrompt.mockResolvedValue(mockResult);

        result = await recipeSummaryService.createRecipeSummary(
          testOrganizationId,
          mockRecipeVersionData,
        );
      });

      it('returns the generated summary', () => {
        expect(result).toBe(mockSummary);
      });

      it('calls executePrompt with the recipe content', () => {
        expect(mockAIService.executePrompt).toHaveBeenCalledWith(
          `${createRecipeSummaryPrompt}\n\n${mockRecipeVersionData.content}`,
        );
      });
    });

    describe('when AI service is not configured', () => {
      beforeEach(() => {
        mockAIService.isConfigured.mockResolvedValue(false);
      });

      it('throws AiNotConfigured error', async () => {
        await expect(
          recipeSummaryService.createRecipeSummary(
            testOrganizationId,
            mockRecipeVersionData,
          ),
        ).rejects.toThrow(AiNotConfigured);
      });

      it('does not call executePrompt', async () => {
        try {
          await recipeSummaryService.createRecipeSummary(
            testOrganizationId,
            mockRecipeVersionData,
          );
        } catch {
          // Expected to throw
        }

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
          recipeSummaryService.createRecipeSummary(
            testOrganizationId,
            mockRecipeVersionData,
          ),
        ).rejects.toThrow('Failed to generate recipe summary: Network error');
      });
    });

    describe('when AI service throws an exception', () => {
      it('propagates the exception', async () => {
        const error = new Error('Connection timeout');
        mockAIService.executePrompt.mockRejectedValue(error);

        await expect(
          recipeSummaryService.createRecipeSummary(
            testOrganizationId,
            mockRecipeVersionData,
          ),
        ).rejects.toThrow('Connection timeout');
      });
    });
  });
});
