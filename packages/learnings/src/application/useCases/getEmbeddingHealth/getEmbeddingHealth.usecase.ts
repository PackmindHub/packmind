import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createSpaceId,
  IAccountsPort,
  IGetEmbeddingHealthUseCase,
  ISpacesPort,
  IStandardsPort,
  IRecipesPort,
  GetEmbeddingHealthCommand,
  GetEmbeddingHealthResponse,
} from '@packmind/types';
import { EmbeddingOrchestrationService } from '../../services/EmbeddingOrchestrationService';

const origin = 'GetEmbeddingHealthUsecase';

export class GetEmbeddingHealthUsecase
  extends AbstractMemberUseCase<
    GetEmbeddingHealthCommand,
    GetEmbeddingHealthResponse
  >
  implements IGetEmbeddingHealthUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetEmbeddingHealthUsecase initialized');
  }

  async executeForMembers(
    command: GetEmbeddingHealthCommand & MemberContext,
  ): Promise<GetEmbeddingHealthResponse> {
    this.logger.info('Getting embedding health stats', {
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

      // Get artifacts without embeddings
      const missingEmbeddings =
        await this.embeddingOrchestrationService.findArtifactsWithoutEmbeddings(
          spaceId,
        );

      // Get all latest versions to calculate totals
      const [allLatestStandards, allLatestRecipes] = await Promise.all([
        this.standardsPort.findAllLatestStandardVersions(spaceId),
        this.recipesPort.findAllLatestRecipeVersions(spaceId),
      ]);

      const totalStandards = allLatestStandards.length;
      const totalRecipes = allLatestRecipes.length;
      const embeddedStandards =
        totalStandards - missingEmbeddings.standards.length;
      const embeddedRecipes = totalRecipes - missingEmbeddings.recipes.length;

      const totalArtifacts = totalStandards + totalRecipes;
      const embeddedArtifacts = embeddedStandards + embeddedRecipes;
      const coveragePercent =
        totalArtifacts > 0
          ? Math.round((embeddedArtifacts / totalArtifacts) * 100)
          : 100;

      this.logger.info('Embedding health stats calculated', {
        spaceId: command.spaceId,
        totalStandards,
        embeddedStandards,
        totalRecipes,
        embeddedRecipes,
        coveragePercent,
      });

      return {
        totalStandards,
        embeddedStandards,
        totalRecipes,
        embeddedRecipes,
        coveragePercent,
      };
    } catch (error) {
      this.logger.error('Failed to get embedding health stats', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
