import { Standard } from '../entities/Standard';
import { OrganizationId, UserId } from '@packmind/accounts/types';
import { IRepository } from '@packmind/shared';

export interface IStandardRepository extends IRepository<Standard> {
  findBySlug(slug: string): Promise<Standard | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Standard[]>;
  findByUserId(userId: UserId): Promise<Standard[]>;
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Standard[]>;
}
