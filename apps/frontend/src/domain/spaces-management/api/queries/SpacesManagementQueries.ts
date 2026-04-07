import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArtifactReference, SpaceId, SpaceType } from '@packmind/types';
import { spacesManagementGateway } from '../gateways';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { spacesQueryKeys } from '../../../spaces/api/queryKeys';
import { getSkillsBySpaceKey } from '../../../skills/api/queryKeys';
import { getStandardsBySpaceKey } from '../../../standards/api/queryKeys';
import { getRecipesBySpaceKey } from '../../../recipes/api/queryKeys';
import { LIST_PACKAGES_BY_SPACE_KEY } from '../../../deployments/api/queryKeys';
import { CHANGE_PROPOSALS_QUERY_SCOPE } from '../../../change-proposals/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';

const CREATE_SPACE_MUTATION_KEY = 'createSpace';

export const useCreateSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [CREATE_SPACE_MUTATION_KEY],
    mutationFn: async ({ name, type }: { name: string; type: SpaceType }) => {
      if (!organization?.id) {
        throw new Error('Organization context required');
      }
      return spacesManagementGateway.createSpace(organization.id, name, type);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...spacesQueryKeys.all],
      });
    },
  });
};

type MoveArtifactsToSpaceMutationParams = {
  destinationSpaceId: SpaceId;
  artifacts: ArtifactReference[];
};

const MOVE_ARTIFACTS_TO_SPACE_MUTATION_KEY = 'moveArtifactsToSpace';

export const useMoveArtifactsToSpaceMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useMutation({
    mutationKey: [MOVE_ARTIFACTS_TO_SPACE_MUTATION_KEY],
    mutationFn: async (params: MoveArtifactsToSpaceMutationParams) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return spacesManagementGateway.moveArtifactsToSpace(organization.id, {
        sourceSpaceId: spaceId,
        ...params,
      });
    },
    onSuccess: async (_data, variables) => {
      const { destinationSpaceId } = variables;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getSkillsBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardsBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getRecipesBySpaceKey(spaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getSkillsBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardsBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: getRecipesBySpaceKey(destinationSpaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: LIST_PACKAGES_BY_SPACE_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE],
        }),
      ]);
    },
  });
};
