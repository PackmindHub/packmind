import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListCommandDistributionsQuery } from '../../api/queries/DeploymentsQueries';
import { CommandId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface CommandDistributionsListProps {
  recipeId: CommandId;
  orgSlug: string;
  spaceSlug: string;
}

export const CommandDistributionsList: React.FC<
  CommandDistributionsListProps
> = ({ recipeId, orgSlug, spaceSlug }) => {
  const {
    data: distributions,
    isLoading: isLoadingDistributions,
    isError,
    error,
  } = useListCommandDistributionsQuery(recipeId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

  const buildUserMap = (
    data: { users: Array<{ userId: string; displayName: string }> } | undefined,
  ): Record<string, string> => {
    if (!data) return { 'N/A': 'Unknown User' };
    return {
      'N/A': 'Unknown User',
      ...Object.fromEntries(
        data.users.map((user) => [user.userId, user.displayName]),
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
