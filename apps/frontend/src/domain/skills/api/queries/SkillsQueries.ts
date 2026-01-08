import { useQuery } from '@tanstack/react-query';
import { OrganizationId, SpaceId } from '@packmind/types';
import { skillsGateway } from '../gateways';
import { GET_SKILLS_KEY } from '../queryKeys';
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
  enabled: !!organizationId && !!spaceId,
});

export const useGetSkillsQuery = () => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(getSkillsBySpaceQueryOptions(organization?.id, spaceId));
};
