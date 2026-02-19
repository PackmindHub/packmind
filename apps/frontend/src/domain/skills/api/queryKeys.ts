import { SkillId, SpaceId } from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

export const SKILLS_QUERY_SCOPE = 'skills';

export enum SkillQueryKeys {
  LIST = 'list',
  BY_SLUG = 'bySlug',
  BY_ID = 'byId',
  VERSIONS = 'versions',
}

export const GET_SKILLS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  SKILLS_QUERY_SCOPE,
  SkillQueryKeys.LIST,
] as const;

export const getSkillBySlugKey = (
  spaceId: SpaceId | undefined,
  slug: string | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    SKILLS_QUERY_SCOPE,
    SkillQueryKeys.BY_SLUG,
    slug,
  ] as const;

export const getSkillByIdKey = (
  spaceId: SpaceId | undefined,
  skillId: SkillId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    SKILLS_QUERY_SCOPE,
    SkillQueryKeys.BY_ID,
    skillId,
  ] as const;

export const getSkillVersionsKey = (
  spaceId: SpaceId | undefined,
  skillId: SkillId | undefined,
) =>
  [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    SKILLS_QUERY_SCOPE,
    SkillQueryKeys.VERSIONS,
    skillId,
  ] as const;
