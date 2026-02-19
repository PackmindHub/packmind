import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrganizationId, SkillId, SpaceId } from '@packmind/types';
import { skillsGateway } from '../gateways';
import {
  GET_SKILLS_KEY,
  getSkillByIdKey,
  getSkillBySlugKey,
  getSkillVersionsKey,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  GET_SKILLS_DEPLOYMENT_OVERVIEW_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../../../deployments/api/queryKeys';

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

export const getSkillWithFilesByIdQueryOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  skillId: SkillId | undefined,
) => ({
  queryKey: getSkillByIdKey(spaceId, skillId),
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch skill');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch skill');
    }
    if (!skillId) {
      throw new Error('Skill ID is required to fetch skill');
    }
    return skillsGateway.getSkillWithFilesById(
      organizationId,
      spaceId,
      skillId,
    );
  },
  enabled: !!organizationId && !!spaceId && !!skillId,
});

export const useGetSkillWithFilesByIdQuery = (skillId: SkillId | undefined) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    getSkillWithFilesByIdQueryOptions(organization?.id, spaceId, skillId),
  );
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

const DELETE_SKILL_MUTATION_KEY = 'deleteSkill';

export const useDeleteSkillMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_SKILL_MUTATION_KEY],
    mutationFn: async (skillId: SkillId) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return skillsGateway.deleteSkill(organization.id, spaceId, skillId);
    },
    onSuccess: async () => {
      // Invalidate skills list
      await queryClient.invalidateQueries({
        queryKey: GET_SKILLS_KEY,
      });

      // Invalidate skills deployment overview
      await queryClient.invalidateQueries({
        queryKey: GET_SKILLS_DEPLOYMENT_OVERVIEW_KEY,
      });

      // Packages containing the deleted skill need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: (error) => {
      console.error('Error deleting skill:', error);
    },
  });
};

const DELETE_SKILLS_BATCH_MUTATION_KEY = 'deleteSkillsBatch';

export const useDeleteSkillsBatchMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_SKILLS_BATCH_MUTATION_KEY],
    mutationFn: async (skillIds: SkillId[]) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return skillsGateway.deleteSkillsBatch(
        organization.id,
        spaceId,
        skillIds,
      );
    },
    onSuccess: async () => {
      // Invalidate skills list
      await queryClient.invalidateQueries({
        queryKey: GET_SKILLS_KEY,
      });

      // Invalidate skills deployment overview
      await queryClient.invalidateQueries({
        queryKey: GET_SKILLS_DEPLOYMENT_OVERVIEW_KEY,
      });

      // Packages containing deleted skills need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: (error) => {
      console.error('Error deleting skills batch:', error);
    },
  });
};
