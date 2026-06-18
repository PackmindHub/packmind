import {
  IRepository,
  OrganizationId,
  QueryOption,
  Skill,
  SkillId,
  SpaceId,
  UserId,
} from '@packmind/types';

export interface ISkillRepository extends IRepository<Skill> {
  findByIds(ids: SkillId[], opts?: QueryOption): Promise<Skill[]>;
  findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null>;
  findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]>;
  findByUserId(userId: UserId): Promise<Skill[]>;
  countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;
  markAsMoved(skillId: SkillId, destinationSpaceId: SpaceId): Promise<void>;
}
