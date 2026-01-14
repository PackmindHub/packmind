import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { AiNotConfigured } from '@packmind/types';
import {
  OrganizationId,
  RecipeId,
  CommandUpdatedEvent,
  SpaceId,
  UserId,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'UpdateRecipeFromUIUsecase';

export interface UpdateRecipeFromUIParams {
  recipeId: RecipeId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  name: string;
  content: string;
  editorUserId: UserId;
}

export class UpdateRecipeFromUIUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('UpdateRecipeFromUIUsecase initialized');
  }

  public async updateRecipeFromUI({
    recipeId,
    spaceId,
    organizationId,
    name,
    content,
    editorUserId,
  }: UpdateRecipeFromUIParams) {
    this.logger.info('Starting updateRecipeFromUI process', {
      recipeId,
      spaceId,
      organizationId,
      name,
      editorUserId,
    });

    try {
      // Get the existing recipe and validate it belongs to the specified space
      this.logger.debug('Fetching existing recipe', { recipeId });
      const existingRecipe = await this.recipeService.getRecipeById(recipeId);

      if (!existingRecipe) {
        this.logger.error('Recipe not found', { recipeId });
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      // Security validation: ensure recipe belongs to the specified space
      if (existingRecipe.spaceId !== spaceId) {
        this.logger.error('Recipe does not belong to specified space', {
          recipeId,
          recipeSpaceId: existingRecipe.spaceId,
          requestedSpaceId: spaceId,
        });
        throw new Error(
          `Recipe ${recipeId} does not belong to space ${spaceId}`,
        );
      }

      // Business logic: Increment version number (same as Git flow)
      const nextVersion = existingRecipe.version + 1;
      this.logger.debug('Incrementing version number', {
        currentVersion: existingRecipe.version,
        nextVersion,
      });

      // Update the recipe entity (no gitCommit for UI updates)
      const updatedRecipe = await this.recipeService.updateRecipe(
        existingRecipe.id,
        {
          name: name.trim(),
          slug: existingRecipe.slug, // slug cannot be edited
          content: content.trim(),
          version: nextVersion,
          gitCommit: undefined, // No git commit for UI updates
          userId: existingRecipe.userId, // Keep original owner
        },
      );

      // Generate summary for the recipe version (AI-generated like Git flow)
      let summary: string | null = null;
      try {
        this.logger.debug('Generating summary for recipe version');
        summary = await this.recipeSummaryService.createRecipeSummary(
          organizationId,
          {
            recipeId: existingRecipe.id,
            name: name.trim(),
            slug: existingRecipe.slug,
            content: content.trim(),
            version: nextVersion,
            summary: null,
            gitCommit: undefined,
            userId: editorUserId,
          },
        );
        this.logger.debug('Summary generated successfully', {
          summaryLength: summary?.length || 0,
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

      // Create new recipe version with editor's userId
      this.logger.debug('Creating new recipe version');
      const newRecipeVersion = await this.recipeVersionService.addRecipeVersion(
        {
          recipeId: existingRecipe.id,
          name: name.trim(),
          slug: existingRecipe.slug,
          content: content.trim(),
          version: nextVersion,
          summary,
          gitCommit: undefined, // No git commit for UI updates
          userId: editorUserId, // Use editor's ID for the version
        },
      );

      this.logger.info('Recipe updated successfully from UI', {
        recipeId,
        newVersion: nextVersion,
        versionId: newRecipeVersion.id,
        editorUserId,
      });

      this.eventEmitterService.emit(
        new CommandUpdatedEvent({
          id: recipeId,
          spaceId,
          newVersion: nextVersion,
          organizationId,
          userId: editorUserId,
          source: 'ui',
        }),
      );

      return updatedRecipe;
    } catch (error) {
      this.logger.error('Failed to update recipe from UI', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
