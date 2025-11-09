import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  OpenAIService,
  AiNotConfigured,
} from '@packmind/node-utils';
import { createRecipeSummaryPrompt } from './cookbook/prompts/create_recipe_summary';
import { RecipeVersion } from '@packmind/types';

const origin = 'RecipeSummaryService';

export class RecipeSummaryService {
  private readonly aiService: AIService;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // Instantiate AIService directly inside the service for now
    // Later this will be injected when we have a clean AI adapter
    this.aiService = new OpenAIService();
  }

  public async createRecipeSummary(
    recipeVersionData: Omit<RecipeVersion, 'id'>,
  ): Promise<string> {
    this.logger.info('Starting createRecipeSummary process', {
      recipeName: recipeVersionData.name,
      version: recipeVersionData.version,
    });

    // Check if AI service is configured before proceeding
    const isConfigured = await this.aiService.isConfigured();
    if (!isConfigured) {
      this.logger.warn(
        'AI service not configured - skipping recipe summary generation',
        {
          recipeName: recipeVersionData.name,
          version: recipeVersionData.version,
        },
      );
      throw new AiNotConfigured(
        'AI service not configured for recipe summary generation',
      );
    }

    try {
      // Build the complete prompt by appending the recipe content
      const fullPrompt = `${createRecipeSummaryPrompt}\n\n${recipeVersionData.content}`;

      this.logger.debug('Built AI prompt for recipe summary', {
        promptLength: fullPrompt.length,
        contentLength: recipeVersionData.content.length,
      });

      // Execute the AI prompt to generate the summary
      const result = await this.aiService.executePrompt<string>(fullPrompt);

      if (!result.success || !result.data) {
        this.logger.error('AI service failed to generate recipe summary', {
          error: result.error,
          attempts: result.attempts,
        });
        throw new Error(
          `Failed to generate recipe summary: ${result.error || 'Unknown AI service error'}`,
        );
      }

      this.logger.info('Recipe summary generated successfully', {
        recipeName: recipeVersionData.name,
        summaryLength: result.data.length,
        attempts: result.attempts,
      });

      return result.data.trim();
    } catch (error) {
      this.logger.error('Failed to create recipe summary', {
        recipeName: recipeVersionData.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
