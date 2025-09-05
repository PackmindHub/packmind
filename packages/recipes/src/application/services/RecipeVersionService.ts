import { v4 as uuidv4 } from 'uuid';
import {
  RecipeVersion,
  RecipeVersionId,
  createRecipeVersionId,
} from '../../domain/entities/RecipeVersion';
import { RecipeId } from '../../domain/entities/Recipe';
import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { RecipeVersionRepository } from '../../infra/repositories/RecipeVersionRepository';
import { PackmindLogger } from '@packmind/shared';

const origin = 'RecipeVersionService';

export class RecipeVersionService {
  constructor(
    private readonly recipeVersionRepository: IRecipeVersionRepository = new RecipeVersionRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipeVersionService initialized');
  }

  async addRecipeVersion(
    recipeVersionData: Omit<RecipeVersion, 'id'>,
  ): Promise<RecipeVersion> {
    this.logger.info('Adding new recipe version', {
      recipeId: recipeVersionData.recipeId,
      version: recipeVersionData.version,
      hasSummary: !!recipeVersionData.summary,
    });

    try {
      const versionId = createRecipeVersionId(uuidv4());
      this.logger.debug('Generated recipe version ID', { versionId });

      const newRecipeVersion: RecipeVersion = {
        id: versionId,
        ...recipeVersionData,
      };

      this.logger.debug('Adding recipe version to repository');
      const savedVersion =
        await this.recipeVersionRepository.add(newRecipeVersion);

      this.logger.info('Recipe version added to repository successfully', {
        versionId,
        recipeId: recipeVersionData.recipeId,
        version: recipeVersionData.version,
        hasSummary: !!savedVersion.summary,
      });

      return savedVersion;
    } catch (error) {
      this.logger.error('Failed to add recipe version', {
        recipeId: recipeVersionData.recipeId,
        version: recipeVersionData.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRecipeVersions(recipeId: RecipeId): Promise<RecipeVersion[]> {
    this.logger.info('Listing recipe versions', { recipeId });

    try {
      const versions =
        await this.recipeVersionRepository.findByRecipeId(recipeId);
      this.logger.info('Recipe versions retrieved successfully', {
        recipeId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list recipe versions', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRecipeVersion(
    recipeId: RecipeId,
    version: number,
  ): Promise<RecipeVersion | null> {
    this.logger.info('Getting recipe version', { recipeId, version });

    try {
      const recipeVersion =
        await this.recipeVersionRepository.findByRecipeIdAndVersion(
          recipeId,
          version,
        );

      if (recipeVersion) {
        this.logger.info('Recipe version found successfully', {
          recipeId,
          version,
          versionId: recipeVersion.id,
        });
      } else {
        this.logger.warn('Recipe version not found', { recipeId, version });
      }

      return recipeVersion;
    } catch (error) {
      this.logger.error('Failed to get recipe version', {
        recipeId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRecipeVersionById(
    id: RecipeVersionId,
  ): Promise<RecipeVersion | null> {
    this.logger.info('Getting recipe version by ID', { versionId: id });

    try {
      const recipeVersion = await this.recipeVersionRepository.findById(id);

      if (recipeVersion) {
        this.logger.info('Recipe version found by ID successfully', {
          versionId: id,
          recipeId: recipeVersion.recipeId,
          version: recipeVersion.version,
        });
      } else {
        this.logger.warn('Recipe version not found by ID', { versionId: id });
      }

      return recipeVersion;
    } catch (error) {
      this.logger.error('Failed to get recipe version by ID', {
        versionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteRecipeVersionsForRecipe(
    recipeId: RecipeId,
    deletedBy?: string,
  ): Promise<void> {
    this.logger.info('Deleting all recipe versions for recipe', {
      recipeId,
      deletedBy,
    });

    try {
      // Get all versions for this recipe
      const versions =
        await this.recipeVersionRepository.findByRecipeId(recipeId);

      if (versions.length === 0) {
        this.logger.info('No recipe versions found to delete', { recipeId });
        return;
      }

      this.logger.debug('Deleting recipe versions', {
        recipeId,
        versionCount: versions.length,
      });

      // Delete all versions
      for (const version of versions) {
        await this.recipeVersionRepository.deleteById(version.id, deletedBy);
        this.logger.debug('Recipe version deleted', {
          recipeId,
          versionId: version.id,
          version: version.version,
        });
      }

      this.logger.info('All recipe versions deleted successfully', {
        recipeId,
        deletedCount: versions.length,
        deletedBy,
      });
    } catch (error) {
      this.logger.error('Failed to delete recipe versions for recipe', {
        recipeId,
        deletedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async prepareForGitPublishing(
    recipeId: RecipeId,
    version: number,
  ): Promise<{ filePath: string; content: string }> {
    this.logger.info('Preparing recipe version for Git publishing', {
      recipeId,
      version,
    });

    try {
      const recipeVersion =
        await this.recipeVersionRepository.findByRecipeIdAndVersion(
          recipeId,
          version,
        );

      if (!recipeVersion) {
        this.logger.error('Recipe version not found for Git publishing', {
          recipeId,
          version,
        });
        throw new Error(
          `Recipe version ${version} not found for recipe ${recipeId}`,
        );
      }

      const filePath = `.packmind/recipes/${recipeVersion.slug}.md`;
      this.logger.info('Recipe version prepared for Git publishing', {
        recipeId,
        version,
        filePath,
        recipeName: recipeVersion.name,
      });

      return {
        filePath,
        content: recipeVersion.content,
      };
    } catch (error) {
      this.logger.error('Failed to prepare recipe version for Git publishing', {
        recipeId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
