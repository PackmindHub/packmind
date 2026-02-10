import { useQuery } from '@tanstack/react-query';
import { OrganizationId, RecipeId, SpaceId } from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import { GET_CHANGE_PROPOSALS_KEY } from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';

export const getChangeProposalsByRecipeIdOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_KEY, recipeId],
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch change proposals');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch change proposals');
    }
    if (!recipeId) {
      throw new Error('Recipe ID is required to fetch change proposals');
    }
    return changeProposalsGateway.getChangeProposals(
      organizationId,
      spaceId,
      recipeId,
    );
  },
  enabled: !!organizationId && !!spaceId && !!recipeId,
});

export const useGetChangeProposalsQuery = (recipeId: RecipeId | undefined) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    getChangeProposalsByRecipeIdOptions(organization?.id, spaceId, recipeId),
  );
};
