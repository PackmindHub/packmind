import {
  IRepository,
  CommandId,
  CommandVersion,
  CommandVersionId,
  SpaceId,
} from '@packmind/types';

export interface ICommandVersionRepository extends IRepository<CommandVersion> {
  findByCommandId(recipeId: CommandId): Promise<CommandVersion[]>;
  findLatestByCommandIds(recipeIds: CommandId[]): Promise<CommandVersion[]>;
  findByIds(commandVersionIds: CommandVersionId[]): Promise<CommandVersion[]>;
  findByCommandIdAndVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null>;
}
