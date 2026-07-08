import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ClientSource,
  IDeploymentPort,
  ICommandsPort,
  OrganizationId,
  Command,
  CommandId,
  CommandVersion,
  CommandVersionId,
  SpaceId,
  TargetId,
  UpdateCommandFromUICommand,
  UserId,
} from '@packmind/types';
import {
  InjectCommandsAdapter,
  InjectDeploymentAdapter,
} from '../../../shared/HexaInjection';

type GetCommandLatestVersionCommand = {
  recipeId: CommandId;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  userId: UserId;
};

@Injectable()
export class CommandsService {
  constructor(
    @InjectCommandsAdapter() private readonly commandsAdapter: ICommandsPort,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger,
  ) {}

  async getCommandsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Command[]> {
    return this.commandsAdapter.listCommandsBySpace({
      spaceId,
      organizationId,
      userId,
    });
  }

  async getCommandById(
    id: CommandId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Command | null> {
    return this.commandsAdapter.getCommandById({
      recipeId: id,
      organizationId,
      spaceId,
      userId,
    });
  }

  async getLatestVersionNumber(
    command: GetCommandLatestVersionCommand,
  ): Promise<number | null> {
    const recipe = await this.commandsAdapter.getCommandById(command);
    return recipe?.version ?? null;
  }

  async addCommand(
    recipe: Omit<
      CommandVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    > & { originSkill?: string },
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
    source: ClientSource,
  ): Promise<Command> {
    return this.commandsAdapter.captureCommand({
      ...recipe,
      summary: recipe.summary ?? undefined,
      organizationId,
      userId,
      spaceId,
      source,
    });
  }

  async updateCommandFromUI(
    command: UpdateCommandFromUICommand,
  ): Promise<Command> {
    const result = await this.commandsAdapter.updateCommandFromUI(command);
    return result.recipe;
  }

  async getCommandVersionsById(id: CommandId): Promise<CommandVersion[]> {
    return this.commandsAdapter.listCommandVersions(id);
  }

  async publishCommandToTargets(
    recipeVersionIds: CommandVersionId[],
    targetIds: TargetId[],
    authorId: UserId,
    organizationId: OrganizationId,
    source: ClientSource,
  ) {
    const result = await this.deploymentAdapter.publishArtifacts({
      userId: authorId,
      organizationId,
      recipeVersionIds,
      standardVersionIds: [],
      targetIds,
      packagesSlugs: [],
      packageIds: [],
      source,
    });

    return {
      deploymentsCreated: true,
      success: true,
      commitsWithChangesCount: result.distributions.filter(
        (distribution) => distribution.gitCommit,
      ).length,
    };
  }

  async deleteCommand(
    id: CommandId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
    source: ClientSource,
  ): Promise<void> {
    await this.commandsAdapter.deleteCommand({
      recipeId: id,
      spaceId,
      userId,
      organizationId,
      source,
    });
  }

  async deleteCommandsBatch(
    recipeIds: CommandId[],
    spaceId: SpaceId,
    userId: UserId,
    organizationId: OrganizationId,
    source: ClientSource,
  ): Promise<void> {
    await this.commandsAdapter.deleteCommandsBatch({
      recipeIds,
      spaceId,
      userId,
      organizationId,
      source,
    });
  }
}
