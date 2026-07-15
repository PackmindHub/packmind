import {
  IRepository,
  CommandId,
  CommandVersion,
  SpaceId,
} from '@packmind/types';

export interface ICommandVersionRepository extends IRepository<CommandVersion> {
  findByCommandId(recipeId: CommandId): Promise<CommandVersion[]>;
  findLatestByCommandId(recipeId: CommandId): Promise<CommandVersion | null>;
  findByCommandIdAndVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null>;
}
