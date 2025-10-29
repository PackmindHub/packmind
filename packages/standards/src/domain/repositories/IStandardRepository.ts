import { Standard } from '../entities/Standard';
import { OrganizationId, UserId } from '@packmind/accounts/types';
import { SpaceId } from '@packmind/shared/types';
import { IRepository } from '@packmind/shared';

export interface IStandardRepository extends IRepository<Standard> {
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Standard[]>;

  findBySpaceId(spaceId: SpaceId): Promise<Standard[]>;
  findByUserId(userId: UserId): Promise<Standard[]>;
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Standard[]>;
}
