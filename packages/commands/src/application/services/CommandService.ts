import { v4 as uuidv4 } from 'uuid';

import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { ICommandRepository } from '../../domain/repositories/ICommandRepository';
import { CommandRepository } from '../../infra/repositories/CommandRepository';
import { PackmindLogger } from '@packmind/logger';
import { CommandNotFoundError } from '../../domain/errors';
import {
  createCommandId,
  createCommandVersionId,
  GitCommit,
  OrganizationId,
  QueryOption,
  Command,
  CommandId,
  CommandVersionId,
  SpaceId,
  UserId,
} from '@packmind/types';

const origin = 'RecipeService';

export type CreateCommandData = {
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
  spaceId: SpaceId;
};

export type UpdateCommandData = {
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
};

export class CommandService {
  constructor(
    private readonly commandRepository: ICommandRepository = new CommandRepository(),
    private readonly commandVersionRepository: ICommandVersionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipeService initialized');
  }

  async addCommand(commandData: CreateCommandData): Promise<Command> {
    this.logger.info('Adding new recipe', {
      name: commandData.name,
      slug: commandData.slug,
      spaceId: commandData.spaceId,
      userId: commandData.userId,
    });

    const recipeId = createCommandId(uuidv4());

    const recipe: Command = {
      id: recipeId,
      ...commandData,
      movedTo: null,
    };

    const savedCommand = await this.commandRepository.add(recipe);
    this.logger.info('Recipe added to repository successfully', {
      recipeId,
      name: commandData.name,
    });

    return savedCommand;
  }

  async listCommandsBySpace(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command[]> {
    this.logger.info('Listing recipes by space', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    const recipes = await this.commandRepository.findBySpaceId(spaceId, opts);
    this.logger.info('Recipes retrieved by space successfully', {
      spaceId,
      count: recipes.length,
    });
    return recipes;
  }

  async countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
    return this.commandRepository.countBySpaceIds(spaceIds);
  }

  async getCommandById(id: CommandId): Promise<Command | null> {
    this.logger.info('Getting recipe by ID', { id });

    const recipe = await this.commandRepository.findById(id);
    if (recipe) {
      this.logger.info('Recipe found successfully', {
        id,
        name: recipe.name,
      });
    } else {
      this.logger.warn('Recipe not found', { id });
    }
    return recipe;
  }

  async findCommandBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command | null> {
    this.logger.info('Finding recipe by slug and organization', {
      slug,
      organizationId,
    });

    const recipe = await this.commandRepository.findBySlug(
      slug,
      organizationId,
      opts,
    );
    if (recipe) {
      this.logger.info('Recipe found by slug and organization successfully', {
        slug,
        organizationId,
        recipeId: recipe.id,
      });
    } else {
      this.logger.warn('Recipe not found by slug and organization', {
        slug,
        organizationId,
      });
    }
    return recipe;
  }

  async updateCommand(
    recipeId: CommandId,
    commandData: UpdateCommandData,
  ): Promise<Command> {
    this.logger.info('Updating recipe', {
      recipeId,
      name: commandData.name,
      userId: commandData.userId,
    });

    const existingCommand = await this.commandRepository.findById(recipeId);
    if (!existingCommand) {
      throw new CommandNotFoundError(recipeId);
    }

    const updatedCommand: Command = {
      id: recipeId,
      ...commandData,
      spaceId: existingCommand.spaceId,
      movedTo: existingCommand.movedTo,
    };

    const savedCommand = await this.commandRepository.add(updatedCommand);
    this.logger.info('Recipe updated in repository successfully', {
      recipeId,
      version: commandData.version,
    });

    return savedCommand;
  }

  async deleteCommand(recipeId: CommandId, userId: UserId): Promise<void> {
    this.logger.info('Deleting recipe and all its versions', { recipeId });

    const recipe = await this.commandRepository.findById(recipeId);
    if (!recipe) {
      throw new CommandNotFoundError(recipeId);
    }

    await this.commandRepository.deleteById(recipeId, userId);

    this.logger.info('Recipe deleted successfully', {
      recipeId,
    });
  }

  async hardDeleteCommand(recipeId: CommandId): Promise<void> {
    this.logger.info('Hard deleting recipe', { recipeId });
    await this.commandRepository.hardDeleteById(recipeId);
  }

  async hardDeleteCommandVersion(versionId: CommandVersionId): Promise<void> {
    this.logger.info('Hard deleting recipe version', { versionId });
    await this.commandVersionRepository.hardDeleteById(versionId);
  }

  async duplicateCommandToSpace(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Command> {
    this.logger.info('Duplicating recipe to space', {
      recipeId,
      destinationSpaceId,
    });

    const original = await this.commandRepository.findById(recipeId);
    if (!original) {
      throw new CommandNotFoundError(recipeId);
    }

    const newCommandId = createCommandId(uuidv4());
    const newCommand: Command = {
      id: newCommandId,
      name: original.name,
      slug: original.slug,
      content: original.content,
      version: original.version,
      gitCommit: original.gitCommit,
      userId: newUserId,
      spaceId: destinationSpaceId,
      movedTo: null,
    };
    const savedCommand = await this.commandRepository.add(newCommand);

    const versions =
      await this.commandVersionRepository.findByCommandId(recipeId);

    if (versions.length > 0) {
      const newVersions = versions.map((version) => ({
        id: createCommandVersionId(uuidv4()),
        recipeId: newCommandId,
        name: version.name,
        slug: version.slug,
        content: version.content,
        version: version.version,
        gitCommit: version.gitCommit,
        userId: version.userId,
      }));
      await this.commandVersionRepository.addMany(newVersions);
    }

    this.logger.info('Recipe duplicated to space successfully', {
      originalRecipeId: recipeId,
      newCommandId,
      destinationSpaceId,
      versionsCount: versions.length,
    });

    return savedCommand;
  }

  async markCommandAsMoved(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking recipe as moved', {
      recipeId,
      destinationSpaceId,
    });

    const recipe = await this.commandRepository.findById(recipeId);
    if (!recipe) {
      throw new CommandNotFoundError(recipeId);
    }

    await this.commandRepository.markAsMoved(recipeId, destinationSpaceId);

    this.logger.info('Recipe marked as moved successfully', {
      recipeId,
      destinationSpaceId,
    });
  }
}
