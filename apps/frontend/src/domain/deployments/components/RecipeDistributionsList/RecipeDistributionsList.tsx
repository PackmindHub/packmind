import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListRecipeDistributionsQuery } from '../../api/queries/DeploymentsQueries';
import { RecipeId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface RecipeDistributionsListProps {
  recipeId: RecipeId;
  orgSlug: string;
  spaceSlug: string;
}

export const RecipeDistributionsList: React.FC<
  RecipeDistributionsListProps
> = ({ recipeId, orgSlug, spaceSlug }) => {
  const {
    data: distributions,
    isLoading: isLoadingDistributions,
    isError,
    error,
  } = useListRecipeDistributionsQuery(recipeId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

  const buildUserMap = (
    data: { users: Array<{ userId: string; email: string }> } | undefined,
  ): Record<string, string> => {
    if (!data) return { 'N/A': 'Unknown User' };
    return {
      'N/A': 'Unknown User',
      ...Object.fromEntries(
        data.users.map((user) => [user.userId, user.email]),
      ),
    };
  };

  return (
    <DeploymentsHistory
      deployments={distributions || []}
      type="recipe"
      entityId={recipeId}
      usersMap={buildUserMap(users)}
      loading={isLoadingDistributions || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Distributions history"
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );
};
