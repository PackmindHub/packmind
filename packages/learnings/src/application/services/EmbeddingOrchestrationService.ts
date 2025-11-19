import { PackmindLogger } from '@packmind/logger';
import { AIService, OpenAIService } from '@packmind/node-utils';
import {
  IStandardsPort,
  IRecipesPort,
  ISpacesPort,
  StandardVersionId,
  RecipeVersionId,
  SpaceId,
  StandardVersion,
  RecipeVersion,
  OrganizationId,
} from '@packmind/types';
import { TextExtractor } from './TextExtractor';
import { IRagLabConfigurationRepository } from '../../domain/repositories/IRagLabConfigurationRepository';

const origin = 'EmbeddingOrchestrationService';

/**
 * Centralized service for orchestrating embedding generation and storage across domains.
 * This service coordinates between TextExtractor, OpenAIService, and domain repositories
 * through their ports to generate and persist embeddings for standards and recipes.
 */
export class EmbeddingOrchestrationService {
  private readonly aiService: AIService;

  constructor(
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly spacesPort: ISpacesPort,
    private readonly ragLabConfigurationRepository: IRagLabConfigurationRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.aiService = new OpenAIService();
    this.logger.info('EmbeddingOrchestrationService initialized');
  }

  /**
   * Get organization ID from a standard version ID
   * @param versionId - Standard version ID
   * @returns Organization ID
   * @throws Error if version, standard, or space not found
   */
  private async getOrganizationIdFromStandardVersion(
    versionId: StandardVersionId,
  ): Promise<OrganizationId> {
    const version = await this.standardsPort.getStandardVersionById(versionId);
    if (!version) {
      throw new Error(`StandardVersion ${versionId} not found`);
    }

    const standard = await this.standardsPort.getStandard(version.standardId);
    if (!standard) {
      throw new Error(`Standard ${version.standardId} not found`);
    }

    const space = await this.spacesPort.getSpaceById(standard.spaceId);
    if (!space) {
      throw new Error(`Space ${standard.spaceId} not found`);
    }

    return space.organizationId;
  }

  /**
   * Get organization ID from a recipe version ID
   * @param versionId - Recipe version ID
   * @returns Organization ID
   * @throws Error if version, recipe, or space not found
   */
  private async getOrganizationIdFromRecipeVersion(
    versionId: RecipeVersionId,
  ): Promise<OrganizationId> {
    const version = await this.recipesPort.getRecipeVersionById(versionId);
    if (!version) {
      throw new Error(`RecipeVersion ${versionId} not found`);
    }

    const recipe = await this.recipesPort.getRecipeByIdInternal(
      version.recipeId,
    );
    if (!recipe) {
      throw new Error(`Recipe ${version.recipeId} not found`);
    }

    const space = await this.spacesPort.getSpaceById(recipe.spaceId);
    if (!space) {
      throw new Error(`Space ${recipe.spaceId} not found`);
    }

    return space.organizationId;
  }

  /**
   * Generate and save embedding for a standard version
   * @param versionId - ID of the standard version to generate embedding for
   * @throws Error if version not found or embedding generation fails
   */
  async generateAndSaveStandardEmbedding(
    versionId: StandardVersionId,
  ): Promise<void> {
    this.logger.info('Generating embedding for standard version', {
      versionId,
    });

    try {
      // Get version through port
      const version =
        await this.standardsPort.getStandardVersionById(versionId);
      if (!version) {
        const errorMsg = `StandardVersion ${versionId} not found`;
        this.logger.error(errorMsg, { versionId });
        throw new Error(errorMsg);
      }

      // Get organization ID to fetch RAG Lab configuration
      const organizationId =
        await this.getOrganizationIdFromStandardVersion(versionId);

      // Fetch RAG Lab configuration for the organization
      const ragLabConfig =
        await this.ragLabConfigurationRepository.findByOrganizationId(
          organizationId,
        );

      const embeddingOptions = ragLabConfig
        ? {
            model: ragLabConfig.embeddingModel,
            dimensions: ragLabConfig.embeddingDimensions,
          }
        : undefined;

      this.logger.debug('Using embedding configuration', {
        versionId,
        organizationId,
        hasConfig: !!ragLabConfig,
        model: embeddingOptions?.model,
        dimensions: embeddingOptions?.dimensions,
      });

      // Extract text
      const text = TextExtractor.extractStandardText(version);
      this.logger.debug('Extracted text for standard embedding', {
        versionId,
        textLength: text.length,
      });

      // Generate embedding with configuration
      const embedding = await this.aiService.generateEmbedding(
        text,
        embeddingOptions,
      );

      if (!embedding || embedding.length === 0) {
        const errorMsg = `Failed to generate embedding for standard version ${versionId}`;
        this.logger.warn(errorMsg, { versionId });
        throw new Error(errorMsg);
      }

      this.logger.debug('Embedding generated for standard', {
        versionId,
        embeddingDimensions: embedding.length,
      });

      // Save through port
      await this.standardsPort.updateStandardVersionEmbedding(
        versionId,
        embedding,
      );

      this.logger.info('Standard embedding saved successfully', {
        versionId,
        embeddingDimensions: embedding.length,
      });
    } catch (error) {
      this.logger.error('Failed to generate standard embedding', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate and save embedding for a recipe version
   * @param versionId - ID of the recipe version to generate embedding for
   * @throws Error if version not found or embedding generation fails
   */
  async generateAndSaveRecipeEmbedding(
    versionId: RecipeVersionId,
  ): Promise<void> {
    this.logger.info('Generating embedding for recipe version', { versionId });

    try {
      // Get version through port
      const version = await this.recipesPort.getRecipeVersionById(versionId);
      if (!version) {
        const errorMsg = `RecipeVersion ${versionId} not found`;
        this.logger.error(errorMsg, { versionId });
        throw new Error(errorMsg);
      }

      // Get organization ID to fetch RAG Lab configuration
      const organizationId =
        await this.getOrganizationIdFromRecipeVersion(versionId);

      // Fetch RAG Lab configuration for the organization
      const ragLabConfig =
        await this.ragLabConfigurationRepository.findByOrganizationId(
          organizationId,
        );

      const embeddingOptions = ragLabConfig
        ? {
            model: ragLabConfig.embeddingModel,
            dimensions: ragLabConfig.embeddingDimensions,
          }
        : undefined;

      this.logger.debug('Using embedding configuration', {
        versionId,
        organizationId,
        hasConfig: !!ragLabConfig,
        model: embeddingOptions?.model,
        dimensions: embeddingOptions?.dimensions,
      });

      // Extract text
      const text = TextExtractor.extractRecipeText(version);
      this.logger.debug('Extracted text for recipe embedding', {
        versionId,
        textLength: text.length,
      });

      // Generate embedding with configuration
      const embedding = await this.aiService.generateEmbedding(
        text,
        embeddingOptions,
      );

      if (!embedding || embedding.length === 0) {
        const errorMsg = `Failed to generate embedding for recipe version ${versionId}`;
        this.logger.warn(errorMsg, { versionId });
        throw new Error(errorMsg);
      }

      this.logger.debug('Embedding generated for recipe', {
        versionId,
        embeddingDimensions: embedding.length,
      });

      // Save through port
      await this.recipesPort.updateRecipeVersionEmbedding(versionId, embedding);

      this.logger.info('Recipe embedding saved successfully', {
        versionId,
        embeddingDimensions: embedding.length,
      });
    } catch (error) {
      this.logger.error('Failed to generate recipe embedding', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find similar standards by embedding vector
   * @param embedding - Embedding vector to search with
   * @param spaceId - Optional space ID to filter results
   * @param threshold - Similarity threshold (default: 0.7)
   * @returns Array of standard versions with similarity scores
   */
  async findSimilarStandards(
    embedding: number[],
    spaceId?: SpaceId,
    threshold?: number,
  ): Promise<Array<StandardVersion & { similarity: number }>> {
    this.logger.info('Finding similar standards by embedding', {
      embeddingDimensions: embedding.length,
      spaceId,
      threshold,
    });

    try {
      const results = await this.standardsPort.findSimilarStandardsByEmbedding(
        embedding,
        spaceId,
        threshold,
      );

      this.logger.info('Similar standards found', {
        count: results.length,
        spaceId,
        threshold,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find similar standards', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find similar recipes by embedding vector
   * @param embedding - Embedding vector to search with
   * @param spaceId - Optional space ID to filter results
   * @param threshold - Similarity threshold (default: 0.7)
   * @returns Array of recipe versions with similarity scores
   */
  async findSimilarRecipes(
    embedding: number[],
    spaceId?: SpaceId,
    threshold?: number,
  ): Promise<Array<RecipeVersion & { similarity: number }>> {
    this.logger.info('Finding similar recipes by embedding', {
      embeddingDimensions: embedding.length,
      spaceId,
      threshold,
    });

    try {
      const results = await this.recipesPort.findSimilarRecipesByEmbedding(
        embedding,
        spaceId,
        threshold,
      );

      this.logger.info('Similar recipes found', {
        count: results.length,
        spaceId,
        threshold,
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to find similar recipes', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find all latest versions without embeddings across both standards and recipes
   * @param spaceId - Optional space ID to filter results
   * @returns Object containing arrays of standards and recipes without embeddings
   */
  async findArtifactsWithoutEmbeddings(spaceId?: SpaceId): Promise<{
    standards: StandardVersion[];
    recipes: RecipeVersion[];
  }> {
    this.logger.info('Finding artifacts without embeddings', { spaceId });

    try {
      const [standards, recipes] = await Promise.all([
        this.standardsPort.findLatestStandardVersionsWithoutEmbedding(spaceId),
        this.recipesPort.findLatestRecipeVersionsWithoutEmbedding(spaceId),
      ]);

      this.logger.info('Artifacts without embeddings found', {
        standardsCount: standards.length,
        recipesCount: recipes.length,
        spaceId,
      });

      return { standards, recipes };
    } catch (error) {
      this.logger.error('Failed to find artifacts without embeddings', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
