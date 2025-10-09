import React, { useMemo } from 'react';
import { useListStandardDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { DeploymentsHistory as GenericDeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';
import { StandardId } from '@packmind/shared';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';

interface DeploymentsHistoryProps {
  standardId: StandardId;
}

export const DeploymentsHistory: React.FC<DeploymentsHistoryProps> = ({
  standardId,
}) => {
  const {
    data: deployments,
    isLoading,
    isError,
    error,
  } = useListStandardDeploymentsQuery(standardId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

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
    <GenericDeploymentsHistory
      deployments={deployments || []}
      type="standard"
      entityId={standardId}
      loading={isLoading || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Deployment History"
      usersMap={userMap}
    />
  );
};
