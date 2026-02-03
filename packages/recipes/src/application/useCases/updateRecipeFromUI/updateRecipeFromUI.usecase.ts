import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AiNotConfigured,
  CommandUpdatedEvent,
  IAccountsPort,
  ISpacesPort,
  IUpdateRecipeFromUIUseCase,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'UpdateRecipeFromUIUsecase';

export class UpdateRecipeFromUIUsecase
  extends AbstractMemberUseCase<
    UpdateRecipeFromUICommand,
    UpdateRecipeFromUIResponse
  >
  implements IUpdateRecipeFromUIUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(accountsPort, new PackmindLogger(origin));
    this.logger.info('UpdateRecipeFromUIUsecase initialized');
  }

  protected async executeForMembers(
    command: UpdateRecipeFromUICommand & MemberContext,
  ): Promise<UpdateRecipeFromUIResponse> {
    const { recipeId, spaceId, organizationId, name, content, userId, source } =
      command;

    this.logger.info('Starting updateRecipeFromUI process', {
      recipeId,
      spaceId,
      organizationId,
      name,
      userId,
    });

    // Verify the space belongs to the organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      this.logger.warn('Space not found', { spaceId });
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== organizationId) {
      this.logger.warn('Space does not belong to organization', {
        spaceId,
        spaceOrganizationId: space.organizationId,
        requestOrganizationId: organizationId,
      });
      throw new Error(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    }

    // Get the existing recipe and validate it belongs to the specified space
    this.logger.info('Fetching existing recipe', { recipeId });
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
      throw new Error(`Recipe ${recipeId} does not belong to space ${spaceId}`);
    }

    // Business logic: Increment version number (same as Git flow)
    const nextVersion = existingRecipe.version + 1;
    this.logger.info('Incrementing version number', {
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
      this.logger.info('Generating summary for recipe version');
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
          userId,
        },
      );
      this.logger.info('Summary generated successfully', {
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
    this.logger.info('Creating new recipe version');
    const newRecipeVersion = await this.recipeVersionService.addRecipeVersion({
      recipeId: existingRecipe.id,
      name: name.trim(),
      slug: existingRecipe.slug,
      content: content.trim(),
      version: nextVersion,
      summary,
      gitCommit: undefined, // No git commit for UI updates
      userId, // Use editor's ID for the version
    });

    this.logger.info('Recipe updated successfully from UI', {
      recipeId,
      newVersion: nextVersion,
      versionId: newRecipeVersion.id,
      userId,
    });

    this.eventEmitterService.emit(
      new CommandUpdatedEvent({
        id: recipeId,
        spaceId,
        newVersion: nextVersion,
        organizationId,
        userId,
        source: source ?? 'ui',
      }),
    );

    return { recipe: updatedRecipe };
  }
}
