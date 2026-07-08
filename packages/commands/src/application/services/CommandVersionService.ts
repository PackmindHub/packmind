import { v4 as uuidv4 } from 'uuid';
import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { CommandVersionRepository } from '../../infra/repositories/CommandVersionRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createCommandVersionId,
  CommandId,
  CommandVersion,
  CommandVersionId,
  SpaceId,
} from '@packmind/types';

const origin = 'RecipeVersionService';

export class CommandVersionService {
  constructor(
    private readonly commandVersionRepository: ICommandVersionRepository = new CommandVersionRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipeVersionService initialized');
  }

  async addCommandVersion(
    commandVersionData: Omit<CommandVersion, 'id'>,
  ): Promise<CommandVersion> {
    this.logger.info('Adding new recipe version', {
      recipeId: commandVersionData.recipeId,
      version: commandVersionData.version,
      hasSummary: !!commandVersionData.summary,
    });

    try {
      const versionId = createCommandVersionId(uuidv4());
      this.logger.debug('Generated recipe version ID', { versionId });

      const newCommandVersion: CommandVersion = {
        id: versionId,
        ...commandVersionData,
      };

      this.logger.debug('Adding recipe version to repository');
      const savedVersion =
        await this.commandVersionRepository.add(newCommandVersion);

      this.logger.info('Recipe version added to repository successfully', {
        versionId,
        recipeId: commandVersionData.recipeId,
        version: commandVersionData.version,
        hasSummary: !!savedVersion.summary,
      });

      return savedVersion;
    } catch (error) {
      this.logger.error('Failed to add recipe version', {
        recipeId: commandVersionData.recipeId,
        version: commandVersionData.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listCommandVersions(recipeId: CommandId): Promise<CommandVersion[]> {
    this.logger.info('Listing recipe versions', { recipeId });

    try {
      const versions =
        await this.commandVersionRepository.findByCommandId(recipeId);
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

  async getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null> {
    this.logger.info('Getting recipe version', { recipeId, version });

    try {
      const recipeVersion =
        await this.commandVersionRepository.findByCommandIdAndVersion(
          recipeId,
          version,
          allowedSpaceIds,
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

  async getCommandVersionById(
    id: CommandVersionId,
  ): Promise<CommandVersion | null> {
    this.logger.info('Getting recipe version by ID', { versionId: id });

    try {
      const recipeVersion = await this.commandVersionRepository.findById(id);

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

  async deleteCommandVersionsForCommand(
    recipeId: CommandId,
    deletedBy?: string,
  ): Promise<void> {
    this.logger.info('Deleting all recipe versions for recipe', {
      recipeId,
      deletedBy,
    });

    try {
      // Get all versions for this recipe
      const versions =
        await this.commandVersionRepository.findByCommandId(recipeId);

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
        await this.commandVersionRepository.deleteById(version.id, deletedBy);
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
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<{ filePath: string; content: string }> {
    this.logger.info('Preparing recipe version for Git publishing', {
      recipeId,
      version,
    });

    try {
      const recipeVersion =
        await this.commandVersionRepository.findByCommandIdAndVersion(
          recipeId,
          version,
          allowedSpaceIds,
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
