import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  createSpaceId,
  IAccountsPort,
  ITriggerEmbeddingBackfillUseCase,
  ISpacesPort,
  ILearningsPort,
  TriggerEmbeddingBackfillCommand,
  TriggerEmbeddingBackfillResponse,
} from '@packmind/types';
import { EmbeddingOrchestrationService } from '../../services/EmbeddingOrchestrationService';

const origin = 'TriggerEmbeddingBackfillUsecase';

export class TriggerEmbeddingBackfillUsecase
  extends AbstractAdminUseCase<
    TriggerEmbeddingBackfillCommand,
    TriggerEmbeddingBackfillResponse
  >
  implements ITriggerEmbeddingBackfillUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
    private readonly spacesPort: ISpacesPort,
    private readonly learningsPort: ILearningsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('TriggerEmbeddingBackfillUsecase initialized');
  }

  protected async executeForAdmins(
    command: TriggerEmbeddingBackfillCommand & AdminContext,
  ): Promise<TriggerEmbeddingBackfillResponse> {
    this.logger.info('Triggering embedding backfill', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      const spaceId = createSpaceId(command.spaceId);

      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(spaceId);
      if (!space) {
        this.logger.warn('Space not found', {
          spaceId: command.spaceId,
        });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      // Get all artifacts without embeddings
      const missingEmbeddings =
        await this.embeddingOrchestrationService.findArtifactsWithoutEmbeddings(
          spaceId,
        );

      this.logger.info('Found artifacts without embeddings', {
        standardsCount: missingEmbeddings.standards.length,
        recipesCount: missingEmbeddings.recipes.length,
      });

      // Enqueue jobs for each missing embedding
      let standardJobsEnqueued = 0;
      let recipeJobsEnqueued = 0;

      for (const standard of missingEmbeddings.standards) {
        await this.learningsPort.enqueueStandardEmbeddingGeneration(
          standard.id,
        );
        standardJobsEnqueued++;
      }

      for (const recipe of missingEmbeddings.recipes) {
        await this.learningsPort.enqueueRecipeEmbeddingGeneration(recipe.id);
        recipeJobsEnqueued++;
      }

      const totalJobsEnqueued = standardJobsEnqueued + recipeJobsEnqueued;

      this.logger.info('Embedding backfill jobs enqueued successfully', {
        spaceId: command.spaceId,
        standardJobsEnqueued,
        recipeJobsEnqueued,
        totalJobsEnqueued,
      });

      return {
        standardJobsEnqueued,
        recipeJobsEnqueued,
        totalJobsEnqueued,
      };
    } catch (error) {
      this.logger.error('Failed to trigger embedding backfill', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
