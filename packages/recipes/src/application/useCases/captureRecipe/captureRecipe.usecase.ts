import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import slug from 'slug';
import {
  LogLevel,
  PackmindLogger,
  AiNotConfigured,
  ICaptureRecipeUseCase,
  CaptureRecipeCommand,
  CaptureRecipeResponse,
} from '@packmind/shared';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { createOrganizationId, createUserId } from '@packmind/accounts';

const origin = 'CaptureRecipeUsecase';

export class CaptureRecipeUsecase implements ICaptureRecipeUseCase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('CaptureRecipeUsecase initialized');
  }

  public async execute(
    command: CaptureRecipeCommand,
  ): Promise<CaptureRecipeResponse> {
    const {
      name,
      content,
      organizationId: orgIdString,
      userId: userIdString,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    this.logger.info('Starting captureRecipe process', {
      name,
      organizationId,
      userId,
    });

    try {
      const recipeSlug = slug(name);

      // Business logic: Create recipe with initial version 1
      const initialVersion = 1;
      const recipe = await this.recipeService.addRecipe({
        name,
        content,
        slug: recipeSlug,
        version: initialVersion,
        gitCommit: undefined,
        organizationId,
        userId,
      });
      this.logger.info('Recipe entity created successfully', {
        recipeId: recipe.id,
        name,
        organizationId,
        userId,
      });

      // Generate summary for the recipe version
      let summary: string | null = null;
      try {
        summary = await this.recipeSummaryService.createRecipeSummary({
          recipeId: recipe.id,
          name,
          slug: recipeSlug,
          content,
          version: initialVersion,
          summary: null,
          gitCommit: undefined,
          userId, // UI creation has a user
        });
      } catch (summaryError) {
        if (summaryError instanceof AiNotConfigured) {
          this.logger.warn(
            'AI service not configured - proceeding without summary',
            {
              error: summaryError.message,
            },
          );
        } else {
          const errorMessage =
            summaryError instanceof Error
              ? summaryError.message
              : String(summaryError);
          this.logger.error(
            'Failed to generate summary, proceeding without summary',
            {
              error: errorMessage,
            },
          );
        }
      }

      const recipeVersion = await this.recipeVersionService.addRecipeVersion({
        recipeId: recipe.id,
        name,
        slug: recipeSlug,
        content,
        version: initialVersion,
        summary,
        gitCommit: undefined,
        userId,
      });
      this.logger.info('Initial recipe version created successfully', {
        versionId: recipeVersion.id,
        recipeId: recipe.id,
        version: initialVersion,
        hasSummary: !!recipeVersion.summary,
      });

      this.logger.info('CaptureRecipe process completed successfully', {
        recipeId: recipe.id,
        versionId: recipeVersion.id,
        name,
        organizationId,
        userId,
      });

      return recipe;
    } catch (error) {
      this.logger.error('Failed to capture recipe', {
        name,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
