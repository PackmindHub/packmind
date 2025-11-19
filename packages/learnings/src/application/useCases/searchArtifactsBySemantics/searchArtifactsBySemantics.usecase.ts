import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  OpenAIService,
} from '@packmind/node-utils';
import {
  createSpaceId,
  IAccountsPort,
  ISearchArtifactsBySemanticsUseCase,
  ISpacesPort,
  SearchArtifactsBySemanticsCommand,
  SearchArtifactsBySemanticsResponse,
} from '@packmind/types';
import { EmbeddingOrchestrationService } from '../../services/EmbeddingOrchestrationService';

const origin = 'SearchArtifactsBySemanticsUsecase';

export class SearchArtifactsBySemanticsUsecase
  extends AbstractMemberUseCase<
    SearchArtifactsBySemanticsCommand,
    SearchArtifactsBySemanticsResponse
  >
  implements ISearchArtifactsBySemanticsUseCase
{
  private readonly openAIService: OpenAIService;

  constructor(
    accountsAdapter: IAccountsPort,
    private readonly embeddingOrchestrationService: EmbeddingOrchestrationService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.openAIService = new OpenAIService();
    this.logger.info('SearchArtifactsBySemanticsUsecase initialized');
  }

  async executeForMembers(
    command: SearchArtifactsBySemanticsCommand & MemberContext,
  ): Promise<SearchArtifactsBySemanticsResponse> {
    this.logger.info('Searching artifacts by semantics', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
      queryTextLength: command.queryText.length,
      threshold: command.threshold,
      maxResults: command.maxResults,
      resultTypes: command.resultTypes,
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

      // Generate embedding from query text
      this.logger.debug('Generating embedding from query text', {
        queryTextLength: command.queryText.length,
      });

      const queryEmbedding = await this.openAIService.generateEmbedding(
        command.queryText,
      );

      if (!queryEmbedding || queryEmbedding.length === 0) {
        const errorMsg = 'Failed to generate embedding from query text';
        this.logger.error(errorMsg, {
          queryTextLength: command.queryText.length,
        });
        throw new Error(errorMsg);
      }

      this.logger.debug('Query embedding generated', {
        embeddingDimensions: queryEmbedding.length,
      });

      // Determine which types to search based on resultTypes parameter
      const resultTypes = command.resultTypes || 'both';
      const shouldSearchStandards =
        resultTypes === 'standards' || resultTypes === 'both';
      const shouldSearchRecipes =
        resultTypes === 'recipes' || resultTypes === 'both';

      // Search requested artifact types in parallel
      const [standards, recipes] = await Promise.all([
        shouldSearchStandards
          ? this.embeddingOrchestrationService.findSimilarStandards(
              queryEmbedding,
              spaceId,
              command.threshold,
            )
          : Promise.resolve([]),
        shouldSearchRecipes
          ? this.embeddingOrchestrationService.findSimilarRecipes(
              queryEmbedding,
              spaceId,
              command.threshold,
            )
          : Promise.resolve([]),
      ]);

      // Sort by similarity descending (already done in repository, but ensure consistency)
      let sortedStandards = standards.sort(
        (a, b) => b.similarity - a.similarity,
      );
      let sortedRecipes = recipes.sort((a, b) => b.similarity - a.similarity);

      // Apply maxResults limit if specified
      if (command.maxResults !== undefined && command.maxResults > 0) {
        // When resultTypes is 'both', split maxResults between standards and recipes
        if (resultTypes === 'both') {
          const halfMax = Math.ceil(command.maxResults / 2);
          sortedStandards = sortedStandards.slice(0, halfMax);
          sortedRecipes = sortedRecipes.slice(0, halfMax);
        } else {
          // For single type searches, apply maxResults directly
          sortedStandards = sortedStandards.slice(0, command.maxResults);
          sortedRecipes = sortedRecipes.slice(0, command.maxResults);
        }
      }

      this.logger.info('Artifacts search completed successfully', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        standardsCount: sortedStandards.length,
        recipesCount: sortedRecipes.length,
        threshold: command.threshold,
        maxResults: command.maxResults,
        resultTypes,
      });

      return {
        standards: sortedStandards,
        recipes: sortedRecipes,
      };
    } catch (error) {
      this.logger.error('Failed to search artifacts by semantics', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
