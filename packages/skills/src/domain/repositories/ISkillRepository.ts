import {
  IRepository,
  OrganizationId,
  QueryOption,
  Skill,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface ISkillRepository extends IRepository<Skill> {
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Skill[]>;
  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]>;
  findByUserId(userId: UserId): Promise<Skill[]>;
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Skill[]>;
}
