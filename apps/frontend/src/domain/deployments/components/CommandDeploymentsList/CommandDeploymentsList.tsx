import React, { useMemo } from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListCommandDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { CommandId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface CommandDeploymentsListProps {
  recipeId: CommandId;
}

export const CommandDeploymentsList: React.FC<CommandDeploymentsListProps> = ({
  recipeId,
}) => {
  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    isError,
    error,
  } = useListCommandDeploymentsQuery(recipeId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

  // Create a mapping of user IDs to emails
  const userMap = useMemo(() => {
    if (!users) return {};
    const usersName = users.users.reduce(
      (map, user) => {
        map[user.userId] = user.displayName;
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
