import {
  IRepository,
  OrganizationId,
  QueryOption,
  Command,
  CommandId,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface ICommandRepository extends IRepository<Command> {
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Command | null>;
  findByUserId(userId: UserId): Promise<Command[]>;

  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command[]>;
  markAsMoved(recipeId: CommandId, destinationSpaceId: SpaceId): Promise<void>;
}
