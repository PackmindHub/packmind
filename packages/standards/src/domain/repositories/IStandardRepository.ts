import {
  IRepository,
  OrganizationId,
  QueryOption,
  SpaceId,
  Standard,
  UserId,
} from '@packmind/types';

export interface IStandardRepository extends IRepository<Standard> {
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]>;
  findByUserId(userId: UserId): Promise<Standard[]>;
}
