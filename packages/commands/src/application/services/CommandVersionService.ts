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
    });

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
    });

    return savedVersion;
  }

  async listCommandVersions(recipeId: CommandId): Promise<CommandVersion[]> {
    this.logger.info('Listing recipe versions', { recipeId });

    const versions =
      await this.commandVersionRepository.findByCommandId(recipeId);
    this.logger.info('Recipe versions retrieved successfully', {
      recipeId,
      count: versions.length,
    });
    return versions;
  }

  async getLatestCommandVersions(
    recipeIds: CommandId[],
  ): Promise<CommandVersion[]> {
    this.logger.info('Getting latest recipe versions', {
      count: recipeIds.length,
    });

    const versions =
      await this.commandVersionRepository.findLatestByCommandIds(recipeIds);

    this.logger.info('Latest recipe versions retrieved successfully', {
      requestedCount: recipeIds.length,
      foundCount: versions.length,
    });

    return versions;
  }

  async getCommandVersionsByIds(
    commandVersionIds: CommandVersionId[],
  ): Promise<CommandVersion[]> {
    this.logger.info('Getting recipe versions by IDs', {
      count: commandVersionIds.length,
    });

    const versions =
      await this.commandVersionRepository.findByIds(commandVersionIds);

    this.logger.info('Recipe versions retrieved by IDs successfully', {
      requestedCount: commandVersionIds.length,
      foundCount: versions.length,
    });

    return versions;
  }

  async getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null> {
    this.logger.info('Getting recipe version', { recipeId, version });

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
  }

  async getCommandVersionById(
    id: CommandVersionId,
  ): Promise<CommandVersion | null> {
    this.logger.info('Getting recipe version by ID', { versionId: id });

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
  }

  async deleteCommandVersionsForCommand(
    recipeId: CommandId,
    deletedBy?: string,
  ): Promise<void> {
    this.logger.info('Deleting all recipe versions for recipe', {
      recipeId,
      deletedBy,
    });

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
  }
}
