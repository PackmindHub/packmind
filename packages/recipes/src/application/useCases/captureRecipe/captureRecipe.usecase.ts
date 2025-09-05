import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import slug from 'slug';
import { LogLevel, PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';

const origin = 'CaptureRecipeUsecase';

export class CaptureRecipeUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('CaptureRecipeUsecase initialized');
  }

  public async captureRecipe({
    name,
    content,
    organizationId,
    userId,
  }: {
    name: string;
    content: string;
    organizationId: OrganizationId;
    userId: UserId;
  }) {
    this.logger.info('Starting captureRecipe process', {
      name,
      organizationId,
      userId,
    });

    try {
      this.logger.debug('Generating slug from recipe name', { name });
      const recipeSlug = slug(name);
      this.logger.debug('Slug generated', { slug: recipeSlug });

      // Business logic: Create recipe with initial version 1
      const initialVersion = 1;

      this.logger.debug('Creating recipe entity');
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
        this.logger.debug('Generating summary for recipe version');
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
        this.logger.debug('Summary generated successfully', {
          summaryLength: summary.length,
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

      this.logger.debug('Creating initial recipe version');
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
