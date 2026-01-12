import { useQuery } from '@tanstack/react-query';
import { OrganizationId, Skill, SkillId, SpaceId } from '@packmind/types';
import { skillsGateway } from '../gateways';
import {
  GET_SKILLS_KEY,
  getSkillBySlugKey,
  getSkillVersionsKey,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const getSkillsBySpaceQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
) => ({
  queryKey: GET_SKILLS_KEY,
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch skills');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch skills');
    }
    return skillsGateway.getSkills(organizationId, spaceId);
  },
  select: (skills: Skill[]) =>
    [...skills].sort((a, b) => a.name.localeCompare(b.name)),
  enabled: !!organizationId && !!spaceId,
});

export const useGetSkillsQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getSkillsBySpaceQueryOptions(organization?.id, spaceId));
};

export const getSkillBySlugQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  slug: string | undefined,
) => ({
  queryKey: getSkillBySlugKey(spaceId, slug),
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch skill');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch skill');
    }
    if (!slug) {
      throw new Error('Skill slug is required to fetch skill');
    }
    return skillsGateway.getSkillBySlug(organizationId, spaceId, slug);
  },
  enabled: !!organizationId && !!spaceId && !!slug,
});

export const useGetSkillBySlugQuery = (slug: string | undefined) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getSkillBySlugQueryOptions(organization?.id, spaceId, slug));
};

export const getSkillVersionsQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  skillId: SkillId | undefined,
) => ({
  queryKey: getSkillVersionsKey(spaceId, skillId),
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch skill versions');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch skill versions');
    }
    if (!skillId) {
      throw new Error('Skill ID is required to fetch skill versions');
    }
    return skillsGateway.getSkillVersions(organizationId, spaceId, skillId);
  },
  enabled: !!organizationId && !!spaceId && !!skillId,
});

export const useGetSkillVersionsQuery = (skillId: SkillId | undefined) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    getSkillVersionsQueryOptions(organization?.id, spaceId, skillId),
  );
};
