import React, { useMemo } from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListRecipeDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { RecipeId } from '@packmind/shared';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface RecipeDeploymentsListProps {
  recipeId: RecipeId;
}

export const RecipeDeploymentsList: React.FC<RecipeDeploymentsListProps> = ({
  recipeId,
}) => {
  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    isError,
    error,
  } = useListRecipeDeploymentsQuery(recipeId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

  // Create a mapping of user IDs to emails
  const userMap = useMemo(() => {
    if (!users) return {};
    const usersName = users.users.reduce(
      (map, user) => {
        map[user.userId] = user.email;
        return map;
      },
      {} as Record<string, string>,
    );
    usersName['N/A'] = 'Unknown User';
    return usersName;
  }, [users]);

  return (
    <DeploymentsHistory
      deployments={deployments || []}
      type="recipe"
      entityId={recipeId}
      usersMap={userMap}
      loading={isLoadingDeployments || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Deployments history"
    />
  );
};
