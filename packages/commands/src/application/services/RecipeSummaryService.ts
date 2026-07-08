import { PackmindLogger } from '@packmind/logger';
import { createRecipeSummaryPrompt } from './cookbook/prompts/create_recipe_summary';
import {
  RecipeVersion,
  OrganizationId,
  ILlmPort,
  AIService,
  AiNotConfigured,
} from '@packmind/types';

const origin = 'RecipeSummaryService';

export class RecipeSummaryService {
  constructor(
    private readonly llmPort?: ILlmPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  private async getAIService(
    organizationId: OrganizationId,
  ): Promise<AIService> {
    if (!this.llmPort) {
      throw new AiNotConfigured(
        'LLM port not configured for RecipeSummaryService',
      );
    }
    const response = await this.llmPort.getLlmForOrganization({
      organizationId,
    });
    if (!response.aiService) {
      this.logger.warn(
        'AI service not available - skipping summary generation',
        {
          organizationId: organizationId.toString(),
        },
      );
      throw new AiNotConfigured(
        'AI service not available for RecipeSummaryService',
      );
    }
    return response.aiService;
  }

  public async createRecipeSummary(
    organizationId: OrganizationId,
    recipeVersionData: Omit<RecipeVersion, 'id'>,
  ): Promise<string> {
    this.logger.info('Starting createRecipeSummary process', {
      organizationId: organizationId.toString(),
      recipeName: recipeVersionData.name,
      version: recipeVersionData.version,
    });

    // Get AI service for the organization
    const aiService = await this.getAIService(organizationId);

    // Check if AI service is configured before proceeding
    const isConfigured = await aiService.isConfigured();
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
      const result = await aiService.executePrompt<string>(fullPrompt);

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
