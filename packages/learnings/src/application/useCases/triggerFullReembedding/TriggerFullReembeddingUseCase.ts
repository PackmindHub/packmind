import { PackmindLogger } from '@packmind/logger';
import {
  ITriggerFullReembeddingUseCase,
  TriggerFullReembeddingCommand,
  TriggerFullReembeddingResponse,
  createOrganizationId,
  ISpacesPort,
  IStandardsPort,
  IRecipesPort,
  StandardVersionId,
  RecipeVersionId,
} from '@packmind/types';

const origin = 'TriggerFullReembeddingUseCase';

/**
 * Use case for triggering full re-embedding of all standards and recipes
 * across all spaces in an organization.
 * This is typically used after changing the RAG Lab embedding configuration.
 */
export class TriggerFullReembeddingUseCase
  implements ITriggerFullReembeddingUseCase
{
  constructor(
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly enqueueStandardEmbeddingGeneration: (
      versionId: StandardVersionId,
    ) => Promise<void>,
    private readonly enqueueRecipeEmbeddingGeneration: (
      versionId: RecipeVersionId,
    ) => Promise<void>,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async execute(
    command: TriggerFullReembeddingCommand,
  ): Promise<TriggerFullReembeddingResponse> {
    const organizationId = createOrganizationId(command.organizationId);

    this.logger.info('Triggering full re-embedding for organization', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    // Get all spaces for the organization
    const spaces =
      await this.spacesPort.listSpacesByOrganization(organizationId);

    this.logger.info('Found spaces for organization', {
      organizationId: command.organizationId,
      spacesCount: spaces.length,
    });

    let standardVersionsQueued = 0;
    let recipeVersionsQueued = 0;

    // Process each space
    for (const space of spaces) {
      this.logger.debug('Processing space for re-embedding', {
        spaceId: space.id,
        spaceName: space.name,
      });

      // Get all latest standard versions for the space
      const standardVersions =
        await this.standardsPort.findAllLatestStandardVersions(space.id);

      this.logger.debug('Found standard versions in space', {
        spaceId: space.id,
        standardVersionsCount: standardVersions.length,
      });

      // Enqueue embedding generation for each standard version
      for (const standardVersion of standardVersions) {
        try {
          await this.enqueueStandardEmbeddingGeneration(standardVersion.id);
          standardVersionsQueued++;

          this.logger.debug('Enqueued standard version for re-embedding', {
            versionId: standardVersion.id,
          });
        } catch (error) {
          this.logger.warn('Failed to enqueue standard for re-embedding', {
            versionId: standardVersion.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Get all latest recipe versions for the space
      const recipeVersions = await this.recipesPort.findAllLatestRecipeVersions(
        space.id,
      );

      this.logger.debug('Found recipe versions in space', {
        spaceId: space.id,
        recipeVersionsCount: recipeVersions.length,
      });

      // Enqueue embedding generation for each recipe version
      for (const recipeVersion of recipeVersions) {
        try {
          await this.enqueueRecipeEmbeddingGeneration(recipeVersion.id);
          recipeVersionsQueued++;

          this.logger.debug('Enqueued recipe version for re-embedding', {
            versionId: recipeVersion.id,
          });
        } catch (error) {
          this.logger.warn('Failed to enqueue recipe for re-embedding', {
            versionId: recipeVersion.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const result: TriggerFullReembeddingResponse = {
      standardVersionsQueued,
      recipeVersionsQueued,
      totalQueued: standardVersionsQueued + recipeVersionsQueued,
    };

    this.logger.info('Full re-embedding triggered successfully', {
      organizationId: command.organizationId,
      ...result,
    });

    return result;
  }
}
