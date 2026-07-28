import {
  IRepository,
  OrganizationId,
  QueryOption,
  SpaceId,
  Standard,
  StandardId,
  UserId,
} from '@packmind/types';

export interface IStandardRepository extends IRepository<Standard> {
  findByIds(ids: StandardId[], opts?: QueryOption): Promise<Standard[]>;
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]>;
  findByUserId(userId: UserId): Promise<Standard[]>;
  markAsMoved(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
  ): Promise<void>;
}
