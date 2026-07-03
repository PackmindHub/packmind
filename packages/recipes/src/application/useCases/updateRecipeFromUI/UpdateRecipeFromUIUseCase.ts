import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CommandUpdatedEvent,
  IAccountsPort,
  ISpacesPort,
  IUpdateRecipeFromUIUseCase,
  UpdateRecipeFromUICommand,
  UpdateRecipeFromUIResponse,
} from '@packmind/types';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'UpdateRecipeFromUIUseCase';

export class UpdateRecipeFromUIUseCase
  extends AbstractSpaceMemberUseCase<
    UpdateRecipeFromUICommand,
    UpdateRecipeFromUIResponse
  >
  implements IUpdateRecipeFromUIUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort, new PackmindLogger(origin));
    this.logger.info('UpdateRecipeFromUIUseCase initialized');
  }

  protected async executeForSpaceMembers(
    command: UpdateRecipeFromUICommand & SpaceMemberContext,
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

    // Create new recipe version with editor's userId
    this.logger.info('Creating new recipe version');
    const newRecipeVersion = await this.recipeVersionService.addRecipeVersion({
      recipeId: existingRecipe.id,
      name: name.trim(),
      slug: existingRecipe.slug,
      content: content.trim(),
      version: nextVersion,
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
